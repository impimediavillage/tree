# 🔊 Sound Files Setup Guide

This guide will help you add the required notification sound files to your app.

## Required Sound Files

Place all files in: `public/sounds/`

| File Name | Description | Duration | Recommended Source |
|-----------|-------------|----------|-------------------|
| `ka-ching.mp3` | Cash register sound for new orders | ~1.5s | Classic register "cha-ching" |
| `coin-drop.mp3` | Coin dropping for payments | ~1s | Single coin drop with echo |
| `success-chime.mp3` | Pleasant success notification | ~1.2s | Gentle bell or chime |
| `vroom.mp3` | Vehicle sound for shipping | ~2s | Delivery truck or car |
| `package-ready.mp3` | Box sealing/package ready | ~1s | Tape dispenser or box close |
| `level-up.mp3` | Achievement fanfare | ~2.5s | Triumphant musical notes |
| `delivered.mp3` | Delivery complete sound | ~1.5s | Doorbell or positive chime |
| `nearby.mp3` | Proximity ping | ~1s | Subtle ping or blip |
| `notification-pop.mp3` | Generic notification | ~0.5s | Short pop or tap sound |

## Where to Find Free Sound Files

### 1. Freesound.org (Recommended)
- **Website:** https://freesound.org
- **License:** Creative Commons (attribution required for some)
- **Quality:** High quality, user-uploaded
- **Search terms:** 
  - "cash register"
  - "coin drop"
  - "success chime"
  - "truck engine"
  - "package tape"
  - "level up"
  - "doorbell"
  - "notification pop"

### 2. Zapsplat
- **Website:** https://www.zapsplat.com
- **License:** Free with attribution
- **Quality:** Professional quality
- **Categories:** UI sounds, game sounds, interface

### 3. Pixabay Sound Effects
- **Website:** https://pixabay.com/sound-effects/
- **License:** Pixabay License (free for commercial use)
- **Quality:** Good variety
- **Filter:** Short duration (< 3 seconds)

### 4. Mixkit Sound Effects
- **Website:** https://mixkit.co/free-sound-effects/
- **License:** Free for commercial use
- **Quality:** High quality, curated
- **Categories:** UI, notification, game sounds

### 5. BBC Sound Effects
- **Website:** https://sound-effects.bbcrewind.co.uk/
- **License:** Free for personal, educational, research use
- **Quality:** Professional BBC archives
- **Note:** Check license for commercial use

## Download Instructions

1. **Search for Sound**
   - Use the recommended search terms above
   - Listen to preview before downloading
   - Ensure duration is appropriate (< 3 seconds)

2. **Download Format**
   - Format: MP3 (recommended) or WAV
   - Quality: 128kbps or higher
   - Channels: Stereo or Mono (both work)

3. **File Preparation**
   - Rename file to exact name in table above
   - Convert to MP3 if needed (use ffmpeg or online converter)
   - Trim silence from start/end if needed

4. **Place in Directory**
   ```bash
   # PowerShell command to verify
   Get-ChildItem C:\www\The-Wellness-Tree\public\sounds\
   ```

## Converting Files (if needed)

### Using FFmpeg (Recommended)

```bash
# Install FFmpeg (if not installed)
# Download from: https://ffmpeg.org/download.html

# Convert WAV to MP3
ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 2 ka-ching.mp3

# Trim silence from beginning and end
ffmpeg -i input.mp3 -af silenceremove=1:0:-50dB output.mp3

# Reduce file size (compress)
ffmpeg -i input.mp3 -codec:a libmp3lame -b:a 128k output.mp3
```

### Online Converters
- **CloudConvert:** https://cloudconvert.com/wav-to-mp3
- **Online-Convert:** https://audio.online-convert.com/convert-to-mp3
- **FreeConvert:** https://www.freeconvert.com/wav-to-mp3

## Testing Sounds

### Browser Console Test
```javascript
// Test a sound file in browser console
new Audio('/sounds/ka-ching.mp3').play();
```

### Using the App
1. Start the development server: `npm run dev`
2. Open browser DevTools console
3. Navigate to any dashboard
4. Sound system should log: `🔊 Notification sound system initialized`
5. Trigger a test notification to hear the sound

## Recommended Sound Characteristics

- **Volume:** Normalized to -14 LUFS
- **Format:** MP3, 128-192 kbps
- **Duration:** 0.5-2.5 seconds
- **Fade:** Short fade-out (100-200ms)
- **Silence:** No leading/trailing silence
- **Stereo:** Can be mono or stereo (app handles both)

## License Attribution

If using Creative Commons sounds, add attribution to your app:

**File:** `public/SOUND_ATTRIBUTIONS.txt`

```
Sound Effect Attributions:

ka-ching.mp3
- Author: [Author Name]
- Source: Freesound.org
- License: CC BY 4.0
- URL: [Sound URL]

coin-drop.mp3
- Author: [Author Name]
- Source: Freesound.org
- License: CC0 (Public Domain)
- URL: [Sound URL]

[Continue for all sounds that require attribution]
```

## Troubleshooting

### Sound Not Playing
1. Check file exists in `public/sounds/`
2. Check filename matches exactly (case-sensitive)
3. Verify MP3 format and codec
4. Check browser console for errors
5. Ensure user interacted with page (autoplay policy)

### Sound Quality Issues
- If sound is too quiet: Increase volume in audio editor
- If sound is distorted: Reduce compression level
- If sound has clicks: Add fade-in/out
- If file is too large: Compress to 128kbps

### Browser Autoplay Policy
- Sounds will only play after user interaction
- Sound system initializes on page load
- First sound may require user gesture (click/tap)

## Next Steps

1. ✅ Download all 9 sound files
2. ✅ Rename to exact filenames above
3. ✅ Place in `public/sounds/` directory
4. ✅ Test in browser console
5. ✅ Create order to hear ka-ching notification!

## Example Sound Pack (All Free)

Here's a curated set of specific sounds you can download right now:

### Freesound.org Pack
1. **ka-ching.mp3** → Search "cash register 1" by Tuudurt
2. **coin-drop.mp3** → Search "coin drop" by davidou
3. **success-chime.mp3** → Search "success bell" by bone666138
4. **vroom.mp3** → Search "car start" by xtrgamr
5. **package-ready.mp3** → Search "tape dispenser" by InspectorJ
6. **level-up.mp3** → Search "level up" by Tuudurt
7. **delivered.mp3** → Search "doorbell" by tim.kahn
8. **nearby.mp3** → Search "notification ping" by n_audioman
9. **notification-pop.mp3** → Search "pop" by xtrgamr

## Support

If you need help finding or preparing sound files, check:
- The Wellness Tree development documentation
- Sound effect community forums
- Audio editing guides online

Happy sound designing! 🎵
