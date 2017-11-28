class PixelFontCanvas {

    static renderText(canvas, text, style = {}) {
        //
    }

    static loadFont(font_dir, font_file, on_success = function(data) {}) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                const fnt = this.responseText;
                const xml = PixelFontCanvas.fntToXML(fnt);
                console.log('xml',xml);
                const fileName = xml.getElementsByTagName('page')[0].getAttribute('file');
                console.log('fileName',fileName);
                const img = new Image();
                img.onload = function() {
                    const data = PixelFontCanvas.registerFont(xml,img);
                    on_success(data);
                };
                img.src = font_dir+fileName;
            }
        };
        xhttp.open("GET", font_dir+font_file, true);
        xhttp.send();
    }

    static fntToXML(text) {
        const lines = text.replace(/\r/g,"").split("\n");
        let xmltext = "<font>\n";
        for (let i = 0; i<lines.length; i++) {
            const line = lines[i].split(" ");
            let tag = '';
            for (let j = 0; j<line.length; j++) {
                let keyval = line[j];
                keyval = keyval.split("=");
                if (keyval[0] != "") {
                    if (j==0) {
                        tag = keyval[0];
                        xmltext += '<'+tag;
                    } else {
                        xmltext += " "+keyval[0]+'="' + keyval[1].replace(/\"/g,'') + '"';
                    }
                }
            }
            if (tag != "") {
                xmltext += "/>\n";
            }
        }
        xmltext += "</font>\n";
        console.log('xml',xmltext);        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmltext,"text/xml");
        return(xmlDoc);
    }

    static registerFont(xml, font_image)
    {
        const data = {};
        const info = xml.getElementsByTagName('info')[0];
        const common = xml.getElementsByTagName('common')[0];
        const fileName = xml.getElementsByTagName('page')[0].getAttribute('file');
        const res = 1;

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
                x: (parseInt(letter.getAttribute('x'), 10) / res),
                y: (parseInt(letter.getAttribute('y'), 10) / res),
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
