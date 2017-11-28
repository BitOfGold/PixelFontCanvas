class PixelFontCanvas {

    constructor(text, style = {}) {
        this._text = text;
        this._font = {
            font: style.font,
            tint: style.tint !== undefined ? style.tint : 0xFFFFFF,
            align: style.align || 'left',
            scale: style.scale !== undefined ? style.scale : 1,
        };
    }


    static loadFont(font_url, on_success = function() {}) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                xml = this.responseXML;
                var fileName = xml.getElementsByTagName('page')[0].getAttribute('file');
                console.log('fileName',fileName);
                var img = new Image();
                img.onload = function() {
                    var data = PixelFontCanvas.registerFont(xml,img);
                    on_success(data);
                };
                img.src = fileName;
            }
        };
        xhttp.open("GET", font_xml_url, true);
        xhttp.send();
    }

    static registerFont(font_xml,font_image) 
    {
        const data = {};
        const info = xml.getElementsByTagName('info')[0];
        const common = xml.getElementsByTagName('common')[0];
        const fileName = xml.getElementsByTagName('page')[0].getAttribute('file');
        res = 1;

        data.font = info.getAttribute('face');
        data.size = parseInt(info.getAttribute('size'), 10);
        data.lineHeight = parseInt(common.getAttribute('lineHeight'), 10) / res;
        data.chars = {};

        // parse letters
        const letters = xml.getElementsByTagName('char');

        for (let i = 0; i < letters.length; i++)
        {
            const letter = letters[i];
            const charCode = parseInt(letter.getAttribute('id'), 10);

            const textureRect = {
                x: (parseInt(letter.getAttribute('x'), 10) / res) + (texture.frame.x / res),
                y: (parseInt(letter.getAttribute('y'), 10) / res) + (texture.frame.y / res),
                width: parseInt(letter.getAttribute('width'), 10) / res,
                height: parseInt(letter.getAttribute('height'), 10) / res
            };

            data.chars[charCode] = {
                xOffset: parseInt(letter.getAttribute('xoffset'), 10) / res,
                yOffset: parseInt(letter.getAttribute('yoffset'), 10) / res,
                xAdvance: parseInt(letter.getAttribute('xadvance'), 10) / res,
                kerning: {},
                textureRect: textureRect,
                texture: font_image,
            };
        }

        // parse kernings
        const kernings = xml.getElementsByTagName('kerning');

        for (let i = 0; i < kernings.length; i++)
        {
            const kerning = kernings[i];
            const first = parseInt(kerning.getAttribute('first'), 10) / res;
            const second = parseInt(kerning.getAttribute('second'), 10) / res;
            const amount = parseInt(kerning.getAttribute('amount'), 10) / res;

            if (data.chars[second])
            {
                data.chars[second].kerning[first] = amount;
            }
        }

        PixelFontCanvas[data.font] = data;

        return data;

    }
}

PixelFontCanvas.fonts = {};
