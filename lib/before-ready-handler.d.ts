import { Flac } from '../index.d';
/**
 * Helper class for encoder / decoder:
 *
 * can cache function calls on the encoder/decoder, when Flac is not ready yet,
 * and then applies them, when Flac becomes ready.
 */
export declare class BeforeReadyHandler<Target, ChacheableCalls> {
    private _target;
    private Flac;
    private _enabled;
    private _isWaitOnReady;
    private _onReadyHandler?;
    private _beforeReadyCache?;
    get isWaitOnReady(): boolean;
    get enabled(): boolean;
    set enabled(val: boolean);
    constructor(_target: Target, enabled: boolean, Flac: Flac);
    handleBeforeReady(funcName: ChacheableCalls, args: ArrayLike<any>): boolean;
    private _reset;
}
