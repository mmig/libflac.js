libFLAC.js encoder/decoder test
-------------------------------


# Generate WAV Input Files

Put a least one WAV-file into directory (recommended format: 96 kHz sampling rate, 24-bit):
```bash
<this_directory>/data/wav_src_files/*.wav
```

Run wav-generator script:
```bash
npm run gen
```

This will create for each source-file
 * WAV files with 8-bit, 16-bit and 24-bit encoding
 * WAV files with 8, 16, 20, 22.5, 32, 44.1, 48, 96 kHz sampling rate

i.e. for each input file, 24 test files will be created in
```bash
<this_directory>/temp/wav_test_files/*.wav
  # bits-per-sample: [8, 16, 24]
  # sampling-rates (Hz): [8000, 16000, 20000, 22500, 32000, 44100, 48000, 96000]
```

# Run Tests

Start encode/decode test:
```bash
npm run test
```

this starts a round-trip encode/decode test, that is, each test file in

    <this directory>/temp/wav_test_files/*.wav

will be encoded to FLAC, and then decoded to WAV again, and
the resulting WAV data will be compared to the input test WAV file.

If the input test file differs from the encoded & decoded WAV file,
the test fails:

    for-each(test-file.wav in dir):
      test-file.wav == decode( encode( test-file.wav ))


# DEV NOTES

In addition to testing, this sub-project is also used for compiling
typescript sources, see `../doc/gulpfile.js`.
