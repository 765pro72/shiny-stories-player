class TextManager {
    constructor() {
        this._container = new PIXI.Container();
        this._loader = PIXI.Loader.shared;
        this._txtFrameMap = new Map();
        this._thisWaitTime = 0;
        this._typingEffect = null;
        //translate
        this._languageType = 0; // 0:jp 1:zh 2:jp+zh
        this._currentText = { jp: '', zh: '' };window.addEventListener('interface-font-change',()=>this._layoutFont());
    }

    set languageType(type) {
        this._languageType = type;
    }

    get stageObj() {
        return this._container;
    }

    get textWaitTime() {
        return this._thisWaitTime;
    }

    get typingEffect() {
        return this._typingEffect;
    }

    reset(clear = true) {
        clearInterval(this._typingEffect);this._typingEffect=null;
        this._container.removeChildren(0, this._container.children.length);
        if (clear) {
            this._txtFrameMap.clear();
            this._endNotification();
        }
    }

    processTextFrameByInput(textFrame, speaker, text, translated_text, isFastForward) {
        this._thisWaitTime = 0;
        // let managerSound = this._loader.resources['managerSound'].sound;

        if (!textFrame || (textFrame == "off" && !this._container.children.length)) { return; }

        if (this._container.children.length) {
            this._container.removeChildren(0, this._container.children.length);
            if (textFrame == "off") { return; }
        }

        // this._thisWaitTime = isFastForward ? 50 : text.length * 300 + 500;
        this._thisWaitTime = isFastForward ? 50 : text ? text.length * 300 + 500 : 50;


        if (!this._txtFrameMap.has(textFrame)) {
            const texture=spriteFromResource(this._loader.resources[`textFrame${textFrame}`]).texture;
            this._txtFrameMap.set(textFrame,new PIXI.NineSlicePlane(texture,100,70,180,24));
        }

        let thisTextFrame = this._txtFrameMap.get(textFrame);
        this._activeFrame=thisTextFrame;this._speakerObj=null;
        thisTextFrame.position.set(100, 450);
        this._container.addChildAt(thisTextFrame, 0);

        let noSpeaker = true;
        if (speaker !== "off") {
            noSpeaker = false;
            let speakerObj = new PIXI.Text(window.storyNames?.[speaker] || speaker, {
                fontFamily: window.InterfaceFont?.family(zhcnFont)||zhcnFont,
                fontSize: 24,
                fill: 0x000000,
                align: 'center',
                padding: 3
            });
            this._container.addChildAt(speakerObj, 1);
            this._speakerObj=speakerObj;
            speakerObj.position.set(260, 462);
        }

        if (translated_text) {
            this._currentText.jp = text;
            this._currentText.zh = translated_text;
            text = this._languageType === 1 ? translated_text : text;
        }

        let family = translated_text && this._languageType === 1 ? zhcnFont : usedFont;
        const textStyle = new PIXI.TextStyle({
            align: "left",
            fontFamily: window.InterfaceFont?.family(family)||family,
            fontSize: 24,
            padding: 3
        });

        this.textObj = new PIXI.Text('', textStyle);
        this._container.addChildAt(this.textObj, noSpeaker ? 1 : 2);
        this.textObj.position.set(240, 510);

        text=String(text||'');
        this._fullDisplayText=text;this._layoutFont();
        let word_index = 0;
        if (this._typingEffect != null) {
            clearInterval(this._typingEffect);
        }

        if (isFastForward) {
            this.textObj.text = text;
        }
        else {
            this._typingEffect = setInterval(() => {
                if (word_index === text.length) {
                    clearInterval(this._typingEffect);
                    // managerSound.stop()
                    this._typingEffect = null;
                }

                // if(!noSpeaker && speaker == 'プロデューサー'){
                //     managerSound.play()
                // }
                this.textObj.text += text.charAt(word_index);
                word_index += 1;
            }, 65);
        }
    }

    toggleLanguage(type) {
        this.languageType = type;

        if (this._typingEffect) {
            clearInterval(this._typingEffect);
            this._typingEffect = null;
        }

        if (this.textObj) {
            let text;
            if (this._languageType === 0) {
                text = this._currentText.jp;
                this.textObj.style.fontFamily = window.InterfaceFont?.family(usedFont)||usedFont;
            }
            else if (this._languageType === 1) {
                text = this._currentText.zh;
                this.textObj.style.fontFamily = window.InterfaceFont?.family(zhcnFont)||zhcnFont;
            }
            this.textObj.text = text ?? '';
            this._fullDisplayText=text??'';this._layoutFont();
        }
    }

    _layoutFont() {
        if(!this.textObj||!this._container.children.includes(this.textObj))return;
        const family=this._languageType===1?zhcnFont:usedFont;
        if(window.InterfaceFont?.applyPixi){InterfaceFont.applyPixi(this.textObj,family,24);if(this._speakerObj)InterfaceFont.applyPixi(this._speakerObj,zhcnFont,24,30);}
        else{this.textObj.style.lineHeight=34;this.textObj.style.padding=8;}
        this.textObj.style.wordWrap=true;this.textObj.style.wordWrapWidth=700;this.textObj.style.breakWords=true;
        const height=PIXI.TextMetrics.measureText(this._fullDisplayText||this.textObj.text||'',this.textObj.style).height+this.textObj.style.padding*2,lift=Math.max(0,height-92);
        this.textObj.y=522-lift;if(this._speakerObj)this._speakerObj.y=470-lift;
        if(this._activeFrame){this._activeFrame.y=450-lift;this._activeFrame.height=this._activeFrame.texture.orig.height+lift;}
        if(this._speakerObj)window.InterfaceFont?.alignInkTop(this._speakerObj,450-lift+14);
        window.InterfaceFont?.alignInkTop(this.textObj,450-lift+70,this._fullDisplayText);
    }

    _endNotification() {
        let owariObj = new PIXI.Text("End", {
            fontFamily: window.InterfaceFont?.family(usedFont)||usedFont,
            fontSize: 40,
            fill: 0xffffff,
            align: 'center'
        });
        this._container.addChildAt(owariObj, 0);
        owariObj.anchor.set(0.5);
        owariObj.position.set(568, 320);
    }
}
