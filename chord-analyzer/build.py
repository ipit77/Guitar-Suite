import os
import re
import shutil
import subprocess

WORKSPACE = "/Users/ipit/.gemini/antigravity/scratch/chord-analyzer"
OUTPUT_HTML = os.path.join(WORKSPACE, "ChromaChord-Standalone.html")

def build_standalone_html():
    print("Building Standalone HTML...")
    with open(os.path.join(WORKSPACE, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # Inline CSS
    def replace_css(match):
        css_path = os.path.join(WORKSPACE, match.group(1))
        with open(css_path, "r", encoding="utf-8") as f:
            css = f.read()
        return f"<style>\n{css}\n</style>"
    
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', replace_css, html)

    # Inline JS
    def replace_js(match):
        js_path = os.path.join(WORKSPACE, match.group(1))
        with open(js_path, "r", encoding="utf-8") as f:
            js = f.read()
        return f"<script>\n{js}\n</script>"

    html = re.sub(r'<script src="([^"]+)"></script>', replace_js, html)

    # Write output
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Created {OUTPUT_HTML}")

def build_ipa():
    print("Building iOS IPA...")
    # Make sure Resources dir exists
    resources_dir = os.path.join(WORKSPACE, "ChromaChord.swiftpm", "App", "Resources")
    os.makedirs(resources_dir, exist_ok=True)
    
    # Copy standalone HTML to Resources
    shutil.copy2(OUTPUT_HTML, os.path.join(resources_dir, "index.html"))
    
    # Run xcodebuild
    swiftpm_dir = os.path.join(WORKSPACE, "ChromaChord.swiftpm")
    build_cmd = [
        "xcodebuild", "-scheme", "ChromaChord", 
        "-destination", "generic/platform=iOS", 
        "-configuration", "Release",
        "CODE_SIGN_IDENTITY=", "CODE_SIGNING_REQUIRED=NO", "CODE_SIGNING_ALLOWED=NO",
        "SYMROOT=./build", "OBJROOT=./build"
    ]
    
    env = os.environ.copy()
    env["DEVELOPER_DIR"] = "/Applications/Xcode.app/Contents/Developer"
    
    print("Running xcodebuild...")
    result = subprocess.run(build_cmd, cwd=swiftpm_dir, env=env, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("xcodebuild failed!")
        print(result.stderr)
        return
        
    print("xcodebuild succeeded. Packaging IPA...")
    build_dir = os.path.join(swiftpm_dir, "build", "Release-iphoneos")
    payload_dir = os.path.join(build_dir, "Payload")
    os.makedirs(payload_dir, exist_ok=True)
    
    # Copy app to payload
    app_path = os.path.join(build_dir, "ChromaChord.app")
    payload_app_path = os.path.join(payload_dir, "ChromaChord.app")
    if os.path.exists(app_path):
        shutil.copytree(app_path, payload_app_path, dirs_exist_ok=True)
    
    # Inject NSMicrophoneUsageDescription into Info.plist
    info_plist_path = os.path.join(payload_app_path, "Info.plist")
    if os.path.exists(info_plist_path):
        subprocess.run(["plutil", "-insert", "NSMicrophoneUsageDescription", "-string", "Wird benötigt, um gespielte Akkorde live zu erkennen.", info_plist_path])

    # Zip it up
    ipa_path = os.path.join(WORKSPACE, "ChromaChord.ipa")
    if os.path.exists(ipa_path):
        os.remove(ipa_path)
        
    subprocess.run(["zip", "-r", ipa_path, "Payload"], cwd=build_dir, capture_output=True)
    print(f"Created {ipa_path}")

def build_macos():
    print("Building macOS App...")
    # Make sure Resources dir exists
    resources_dir = os.path.join(WORKSPACE, "ChromaChord.swiftpm", "App", "Resources")
    os.makedirs(resources_dir, exist_ok=True)
    
    # Copy standalone HTML to Resources
    shutil.copy2(OUTPUT_HTML, os.path.join(resources_dir, "index.html"))
    
    # Run xcodebuild for macOS
    swiftpm_dir = os.path.join(WORKSPACE, "ChromaChord.swiftpm")
    build_cmd = [
        "xcodebuild", "-scheme", "ChromaChord", 
        "-destination", "platform=macOS", 
        "-configuration", "Release",
        "CODE_SIGN_IDENTITY=", "CODE_SIGNING_REQUIRED=NO", "CODE_SIGNING_ALLOWED=NO",
        "SYMROOT=./build", "OBJROOT=./build"
    ]
    
    env = os.environ.copy()
    env["DEVELOPER_DIR"] = "/Applications/Xcode.app/Contents/Developer"
    
    print("Running xcodebuild for macOS...")
    result = subprocess.run(build_cmd, cwd=swiftpm_dir, env=env, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("xcodebuild macOS failed!")
        print(result.stderr)
        return
        
    print("xcodebuild macOS succeeded. Packaging App...")
    # Try both possible locations
    build_dir_native = os.path.join(swiftpm_dir, "build", "Release")
    build_dir_catalyst = os.path.join(swiftpm_dir, "build", "Release-maccatalyst")
    
    app_source = os.path.join(build_dir_native, "ChromaChord.app")
    if not os.path.exists(app_source):
        app_source = os.path.join(build_dir_catalyst, "ChromaChord.app")
        
    app_dest = os.path.join(WORKSPACE, "ChromaChord.app")
    
    if os.path.exists(app_dest):
        shutil.rmtree(app_dest)
    
    if os.path.exists(app_source):
        shutil.copytree(app_source, app_dest)
        
        # Inject NSMicrophoneUsageDescription into Info.plist for macOS
        # For Catalyst/macOS, Info.plist might be in different places
        info_plist_path = os.path.join(app_dest, "Contents", "Info.plist")
        if not os.path.exists(info_plist_path):
            info_plist_path = os.path.join(app_dest, "Info.plist") # Standard for some layouts
            
        if os.path.exists(info_plist_path):
            subprocess.run(["plutil", "-insert", "NSMicrophoneUsageDescription", "-string", "Wird benötigt, um gespielte Akkorde live zu erkennen.", info_plist_path])
        
        print(f"Created {app_dest}")
    else:
        print(f"Could not find built app at native or catalyst locations.")

if __name__ == "__main__":
    build_standalone_html()
    build_ipa()
    build_macos()
