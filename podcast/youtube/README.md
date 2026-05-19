# Podcast Audio Compression Best Practices

This directory contains podcast audio files. Due to the spoken-word nature of podcasts, we can achieve maximum compression while retaining excellent intelligibility.

## Recommended Format & Codec

*   **Format:** `.opus` or `.ogg`
*   **Codec:** `libopus`

The Opus codec is the modern gold standard for spoken word audio, dramatically outperforming MP3 and AAC at lower bitrates.

## General Parameters for Spoken Word

When compressing the audio, use the following parameters for maximum space savings without compromising vocal clarity:

1.  **Bitrate (`-b:a 32k`):** 32 kilobits per second. This is generally more than sufficient for clear mono speech.
2.  **Channels (`-ac 1`):** Mono. Podcasts usually consist of people speaking with no critical directional audio. Downmixing stereo to mono cuts the required data rate in half, reducing the final file size.
3.  **Variable Bitrate (`-vbr on`):** Allows the encoder to reduce the bitrate during silences or pauses, further maximizing efficiency.

## FFmpeg Command Template

Use the following `ffmpeg` command to apply these settings to extract and compress audio from a video or uncompressed audio file:

```bash
ffmpeg -i "input_file.mp4" -c:a libopus -b:a 32k -vbr on -ac 1 "output_file.opus"
```

### Explanation of flags:
*   `-i "input_file.mp4"`: Input file.
*   `-c:a libopus`: Re-encodes the audio stream using the Opus codec.
*   `-b:a 32k`: Targets an average bitrate of 32 kbps.
*   `-vbr on`: Enables Variable Bitrate mode (default for Opus but useful to explicitly declare).
*   `-ac 1`: Downmixes multi-channel audio to mono.
*   `"output_file.opus"`: The compressed output file path.

## Real-World Example: AAC vs. Opus

When working with video files, simply extracting the audio track as an MP3 (with default high-quality settings) can inadvertently inflate the bitrate and create bloated files.

**Original Video/Audio Source:**
- **Source Material:** A 2.5 hour podcast interview ("Joe Rogan Experience #2422 - Jensen Huang")
- **Original format embedded in video:** AAC stream at ~128 kbps stereo.

**Extraction & Compression Results:**

1.  **Extracting Original Audio (`.m4a`):** 
    - Command: `ffmpeg -i "input.mp4" -vn -c:a copy "output.m4a"`
    - Action: Directly copies the existing AAC stream without re-encoding.
    - **Resulting File Size:** ~140 MB

2.  **Compressing to Opus (`.opus`):**
    - Command: `ffmpeg -i "output.m4a" -c:a libopus -b:a 32k -vbr on -ac 1 "output.opus"`
    - Action: Re-encodes the original AAC to Opus at 32 kbps mono.
    - **Resulting File Size:** ~35 MB

**Compression Ratio:** The Opus file achieves roughly a **75% reduction** in file size (~4x smaller) compared to the original AAC track, while maintaining excellent intelligibility for the spoken word content.
