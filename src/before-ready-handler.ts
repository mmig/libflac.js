
import { Flac, ReadyEvent } from '../index.d';

/**
 * Helper class for encoder / decoder:
 *
 * can cache function calls on the encoder/decoder, when Flac is not ready yet,
 * and then applies them, when Flac becomes ready.
 */
export class BeforeReadyHandler<Target, ChacheableCalls> {

	private _enabled: boolean = false;

	private _isWaitOnReady: boolean = false;
	private _onReadyHandler?: (evt: ReadyEvent) => void;
	private _beforeReadyCache?: {func: ChacheableCalls, args: any[]}[];

	public get isWaitOnReady(): boolean {
		return this._isWaitOnReady;
	}

	public get enabled(): boolean {
		return this._enabled;
	}

	public set enabled(val: boolean) {
		if(!val && this._enabled){
			this._reset();
		}
		this._enabled = this.enabled;
	}

	public constructor(private _target: Target, enabled: boolean, private Flac: Flac){
		this._enabled = enabled;
	}

	public handleBeforeReady(funcName: ChacheableCalls, args: ArrayLike<any>): boolean {
		if(!this.Flac.isReady() && this.enabled){

			if(!this._isWaitOnReady){
				this._beforeReadyCache = this._beforeReadyCache || [];
				this._onReadyHandler = (_evt: ReadyEvent): void => {
					if(this._beforeReadyCache){
						this._beforeReadyCache.forEach(entry => (this._target as any)[entry.func].apply(this._target, entry.args));
					}
					this._reset();
				};
				this.Flac.on('ready', this._onReadyHandler);
				this._isWaitOnReady = true;
			}

			if(this._beforeReadyCache){
				this._beforeReadyCache.push({func: funcName, args: Array.from(args)});
				return true;
			}
		}
		return false;
	}

	private _reset(): void {
		if(this._beforeReadyCache){
			this._beforeReadyCache = void(0);
		}
		if(this._onReadyHandler){
			this.Flac.off('ready', this._onReadyHandler);
			this._onReadyHandler = void(0);
		}
		this._isWaitOnReady = false;
	}
}
