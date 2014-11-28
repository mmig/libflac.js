// libflac function wrappers

var READSIZE = 4096;

return {
    _module: Module, 
    FLAC__stream_encoder_set_verify: Module.cwrap('FLAC__stream_encoder_set_verify', 'number', [ 'number' ]),
    FLAC__stream_encoder_set_compression_level: Module.cwrap('FLAC__stream_encoder_set_compression_level', 'number', [ 'number', 'number' ]),
    /* ... */
    
    // FLAC__StreamEncoder* init_libflac(unsigned sample_rate, unsigned channels, unsigned bps, unsigned compression_level, unsigned total_samples);
    init_libflac: function(sample_rate, channels, bps, compression_level, total_samples){
        var ok = true;
        var encoder = Module.ccall('FLAC__stream_encoder_new', 'number', [ ], [ ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, true ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_compression_level', 'number', ['number', 'number'], [ encoder, compression_level ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_channels', 'number', ['number', 'number'], [ encoder, channels ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_bits_per_sample', 'number', ['number', 'number'], [ encoder, bps ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_sample_rate', 'number', ['number', 'number'], [ encoder, sample_rate ]);
        ok &= Module.ccall('FLAC__stream_encoder_set_total_samples_estimate', 'number', ['number', 'number'], [ encoder, total_samples ]);
        if (ok){
            return encoder;
        }
        return 0;
    },
    init_encoder_stream: function(encoder, write_callback_fn, client_data){
        client_data = client_data|0;
        var callback_fn_ptr = Runtime.addFunction(function(p_encoder, buffer, bytes, samples, current_frame, p_client_data){
            var arraybuf = new ArrayBuffer(buffer);
            var retdata = new Uint8Array(bytes);
            retdata.set(HEAPU8.subarray(buffer, buffer + bytes));
            // write_callback_fn(retdata, bytes, p_client_data);
            write_callback_fn(retdata, bytes, samples, current_frame, p_client_data);
        });
		var init_status = Module.ccall('FLAC__stream_encoder_init_stream', 'number', ['number', 'number', 'number', 'number', 'number', 'number'], [encoder, callback_fn_ptr, 0, 0, 0, client_data]);
        // FLAC__STREAM_ENCODER_INIT_STATUS_OK = 0
        // if( init_status != 0){
            // return false;
        // }
        // return true;
        return init_status;
    },
    encode_buffer_pcm_as_flac: function(encoder, buffer, channels, no_items){
        // get the length of the data in bytes
        var numBytes = buffer.length * buffer.BYTES_PER_ELEMENT;
        // console.log("DEBUG numBytes: " + numBytes);
        // malloc enough space for the data
        var ptr = Module._malloc(numBytes);
        // get a bytes-wise view on the newly allocated buffer
        var heapBytes= new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        // console.log("DEBUG heapBytes: " + heapBytes);
        // copy data into heapBytes
        heapBytes.set(new Uint8Array(buffer.buffer));
        // return Module.ccall('FLAC__stream_encoder_process_interleaved', 'number', ['number', 'number', 'number'], [encoder, heapBytes.byteOffset, buffer.length]);
        return Module.ccall('FLAC__stream_encoder_process_interleaved', 'number', ['number', 'number', 'number'], [encoder, heapBytes.byteOffset, no_items]);
    },
    FLAC__stream_encoder_init_file: Module.cwrap('FLAC__stream_encoder_init_file', 'number', [ 'number', 'number', 'number', 'number' ]),
    FLAC__stream_encoder_finish: Module.cwrap('FLAC__stream_encoder_finish', 'number', [ 'number' ]),
    FLAC__stream_encoder_delete: Module.cwrap('FLAC__stream_encoder_delete', 'number', [ 'number' ])

};
})();

if (typeof self !== "undefined" && self !== null){
    self.Flac = Flac; // make Flac accessible to other webworker scripts.
}