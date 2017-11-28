class PixelFontCanvas {

    //Loads a .fnt font file and an image from font_dir (wih slash!) directory, registers font by font face
    static loadFont(font_dir, font_file, on_success = function(data) {}) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                const fnt = this.responseText;
                const xml = PixelFontCanvas._fntToXML(fnt);
                const fileName = xml.getElementsByTagName('page')[0].getAttribute('file');
                const img = new Image();
                img.onload = function() {
                    const data = PixelFontCanvas._registerFontXML(xml,img);
                    on_success(data);
                };
                img.src = font_dir+fileName;
            }
        };
        xhttp.open("GET", font_dir+font_file, true);
        xhttp.send();
    }

    //registers a preloaded .fnt text and a preloaded image object as a font, registers font by font face
    static registerFont(fnt_text, image_obj) {
        const xml = PixelFontCanvas._fntToXML(fnt_text);
        const data = PixelFontCanvas._registerFontXML(xml,img);
    }

    //draws text to canvas, style and position in style
    static drawText(canvas, text, style={}) {
        style = {
            font: style.font,
            x: style.x !== undefined ? style.x : 0,
            y: style.y !== undefined ? style.y : 0,
            width: style.width !== undefined ? style.width : canvas.width,
            scale: style.scale !== undefined ? style.scale : 1,
            align: style.align || 'left',
            tint: style.tint !== undefined ? style.tint : '#FFFFFF',
        };
        const data = PixelFontCanvas.fonts[style.font];
        const scale = style.scale;
        const pos = {x: 0, y: 0};
        const chars = [];
        const lineWidths = [];
        const _glyphs = [];
        
        let prevCharCode = null;
        let lastLineWidth = 0;
        let maxLineWidth = 0;
        let line = 0;
        let lastSpace = -1;
        let lastSpaceWidth = 0;
        let spacesRemoved = 0;
        let maxLineHeight = 0;

        for (let i = 0; i < text.length; i++)
        {
            const charCode = text.charCodeAt(i);

            if (/(\s)/.test(text.charAt(i)))
            {
                lastSpace = i;
                lastSpaceWidth = lastLineWidth;
            }

            if (/(?:\r\n|\r|\n)/.test(text.charAt(i)))
            {
                lineWidths.push(lastLineWidth);
                maxLineWidth = Math.max(maxLineWidth, lastLineWidth);
                line++;

                pos.x = 0;
                pos.y += data.lineHeight;
                prevCharCode = null;
                continue;
            }

            if (lastSpace !== -1 && style.width > 0 && pos.x * scale > style.width)
            {
                //todo
                //core.utils.removeItems(chars, lastSpace - spacesRemoved, i - lastSpace);
                i = lastSpace;
                lastSpace = -1;
                ++spacesRemoved;

                lineWidths.push(lastSpaceWidth);
                maxLineWidth = Math.max(maxLineWidth, lastSpaceWidth);
                line++;

                pos.x = 0;
                pos.y += data.lineHeight;
                prevCharCode = null;
                continue;
            }

            const charData = data.chars[charCode];

            if (!charData)
            {
                continue;
            }

            if (prevCharCode && charData.kerning[prevCharCode])
            {
                pos.x += charData.kerning[prevCharCode];
            }

            chars.push({
                line,
                charCode,
                position: {x:pos.x+charData.xOffset, y:pos.y+charData.yOffset},
                charData: charData
            });
            lastLineWidth = pos.x + (data.texture.naturalWidth + charData.xOffset);
            pos.x += charData.xAdvance;
            maxLineHeight = Math.max(maxLineHeight, (charData.yOffset + data.texture.naturalHeight));
            prevCharCode = charCode;
        }

        lineWidths.push(lastLineWidth);
        maxLineWidth = Math.max(maxLineWidth, lastLineWidth);

        const lineAlignOffsets = [];

        for (let i = 0; i <= line; i++)
        {
            let alignOffset = 0;

            if (style.align === 'right')
            {
                alignOffset = maxLineWidth - lineWidths[i];
            }
            else if (style.align === 'center')
            {
                alignOffset = (maxLineWidth - lineWidths[i]) / 2;
            }

            lineAlignOffsets.push(alignOffset);
        }

        const lenChars = chars.length;
        const tint = style.tint;

        for (let i = 0; i < lenChars; i++)
        {
            let c = {position: {x: 0,y: 0}, rect: chars[i].charData.textureRect, scale: {x:0, y: 0}, tint: '#FFFFFF'};
            _glyphs.push(c);
            c.position.x = (chars[i].position.x + lineAlignOffsets[chars[i].line]) * scale;
            c.position.y = chars[i].position.y * scale;
            c.scale.x = c.scale.y = scale;
        }

        let drawData = {};
        drawData.textWidth = maxLineWidth * scale;
        drawData.textHeight = (pos.y + data.lineHeight) * scale;
        drawData.texture = data.texture;
        drawData.font = style.font;
        drawData.tint = style.tint;

        for (let i = 0; i < lenChars; i++)
        {
            _glyphs[i].position.x += style.x;
            _glyphs[i].position.y += style.y;
        }

        drawData.maxLineHeight = maxLineHeight * scale;

        PixelFontCanvas._renderText(canvas, drawData, _glyphs);
    }

    static _renderText(canvas, drawData, glyphs) {
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        /*if (PixelFontCanvas._texture_cache[drawData.font+'-'+drawData.tint]) {
            const el = PixelFontCanvas._texture_cache[drawData.font+'-'+drawData.tint];
        } else {*/
            const texture = drawData.texture;
            
            // Create a buffer element to draw based on the Image img
            const el = Object.assign(document.createElement('canvas'), {
                width: canvas.width,
                height: canvas.height
            });
            let btx = el.getContext('2d');
            btx.imageSmoothingEnabled = false;

            btx.drawImage(texture, 0, 0);

            // Now we'll multiply a rectangle of your chosen color
            btx.fillStyle = drawData.tint;
            btx.globalCompositeOperation = 'multiply';
            btx.fillRect(0, 0, el.width, el.height);
            
            // Finally, fix masking issues you'll probably incur and optional globalAlpha
            btx.globalAlpha = 1;
            btx.globalCompositeOperation = 'destination-in';
            btx.drawImage(texture, 0, 0);
            PixelFontCanvas._texture_cache[drawData.font+'-'+drawData.tint] = el;
        // }
        
        const lenGlyphs = glyphs.length;
        for (let i = 0; i < lenGlyphs; i++) {
            let g = glyphs[i];
            ctx.drawImage(el,g.rect.x,g.rect.y,g.rect.width,g.rect.height,g.position.x,g.position.y,g.rect.width*g.scale.x,g.rect.height*g.scale.y);
        }
    }

    static _fntToXML(text) {
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
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmltext,"text/xml");
        return(xmlDoc);
    }

    static _registerFontXML(xml, font_image)
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

        data.texture = font_image;
        
        PixelFontCanvas.fonts[data.font] = data;

        return data;
    }

}

PixelFontCanvas.fonts = {};
PixelFontCanvas._texture_cache = {};
