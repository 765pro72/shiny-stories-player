class SoundManager {
    constructor() {
        this._loader = PIXI.Loader.shared;
        this._currentBgm = null;
        this._currentVoice = null;
        this._currentSe = null;
        this._onVoiceEnd = null;
        this._voiceDuration = 0;

        PIXI.sound.volumeAll = 0.1;
    }

    get voiceDuration() {
        return this._voiceDuration;
    }

    reset() {
        this.stopVoice();
        if (this._currentVoice) {
            this._currentVoice.stop();
            this._currentVoice = null;
        }
        if (this._currentBgm) {
            this._currentBgm.stop();
            this._currentBgm = null;
        }
        if (this._currentSe) {
            this._currentSe.stop();
            this._currentSe = null;
        }
    }

    processSoundByInput(bgm, se, voice, charLabel, onVoiceEnd, isFastForward) {
        if (isFastForward) { return; }
        if (bgm) {
            this._playBgm(bgm);
        }

        if (se) {
            this._playSe(se);
        }

        if (voice) {
            this._playVoice(voice, charLabel, onVoiceEnd);
        }
    }

    _playBgm(bgmName) {
        if (bgmName == "pause") {
            if (this._currentBgm) this._currentBgm.paused = true;
            return;
        }
        if (bgmName == "resume") {
            if (this._currentBgm) this._currentBgm.paused = false;
            return;
        }
        if (bgmName == "fade_out") {
            TweenMax.to(this._currentBgm, 0, { volume: 0 });
            return;
        }
        if (this._currentBgm) { this._currentBgm.stop(); }
        if (bgmName == "off") { return; }

        this._currentBgm = this._loader.resources[`bgm${bgmName}`].sound;
        this._currentBgm.autoPlay = true;
        this._currentBgm.play({
            loop: true,
            singleInstance: true
        });
        this._currentBgm.volume = 0.3;
    }

    _playSe(seName) {
        this._currentSe = this._loader.resources[`se${seName}`].sound.play({
            loop: false
        });
    }

    _playVoice(voiceName, charLabel, onVoiceEnd) {
        this.stopVoice();
        if (voiceName === 'off' || voiceName === 'fade_out') return;
        const sound=this._loader.resources[`voice${voiceName}`]?.sound;
        if(!sound)return;
        const token=this._voiceToken;
        this._voiceDuration=(Number(sound.duration)||1.5)*1000;
        this._voiceUntil=Date.now()+this._voiceDuration;
        this._onVoiceEnd=()=>onVoiceEnd?.(charLabel);
        const instance=sound.play({loop:false,singleInstance:true});
        this._currentVoice=instance;
        instance?.on?.('end',()=>{if(token!==this._voiceToken)return;this._currentVoice=null;this._voiceUntil=0;this._onVoiceEnd?.();this._onVoiceEnd=null;});
    }

    stopVoice(){
        this._voiceToken=(this._voiceToken||0)+1;
        const voice=this._currentVoice;this._currentVoice=null;
        voice?.stop?.();this._onVoiceEnd?.();this._onVoiceEnd=null;
        this._voiceUntil=0;this._voiceDuration=0;
    }
}
