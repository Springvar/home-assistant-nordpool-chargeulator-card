export function parseYamlConfig(text) {
    let config = {};
    const lines = text.split('\n');

    function getIndent(line) {
        return line.match(/^(\s*)/)[1].length;
    }

    let i = 0;
    while (i < lines.length) {
        let line = lines[i];
        let trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            i++;
            continue;
        }

        let m = trimmed.match(/^([\w_]+):\s*(.*)$/);
        if (m && !trimmed.endsWith(':')) {
            let [, key, value] = m;
            if (value.startsWith('[') && value.endsWith(']')) {
                config[key] = JSON.parse(value.replace(/'/g, '"'));
            } else if (!isNaN(Number(value))) {
                config[key] = Number(value);
            } else if (value === 'true' || value === 'false') {
                config[key] = value === 'true';
            } else {
                config[key] = value;
            }
            i++;
            continue;
        }

        let blockMatch = trimmed.match(/^([\w_]+):$/);
        if (blockMatch) {
            const key = blockMatch[1];
            const baseIndent = getIndent(line);

            let arr = [];
            let iArr = i + 1;
            while (iArr < lines.length) {
                let l = lines[iArr];
                let lTrim = l.trim();

                if (!lTrim.startsWith('-')) {
                    if (getIndent(l) <= baseIndent) break;
                    iArr++;
                    continue;
                }

                if (lTrim === '-') {
                    iArr++;
                    continue;
                }
                if (lTrim.startsWith('- ') && lTrim.indexOf(':') > 1) {
                    let obj = {};
                    let firstLine = lTrim.replace(/^- /, '');
                    let colonIdx = firstLine.indexOf(':');
                    let k = firstLine.slice(0, colonIdx).trim();
                    let v = firstLine.slice(colonIdx + 1).trim();
                    if (!isNaN(Number(v))) v = Number(v);
                    obj[k] = v;

                    let objIndent = getIndent(l);
                    let j = iArr + 1;
                    while (j < lines.length) {
                        let nextLine = lines[j];
                        let nextTrim = nextLine.trim();
                        if (!nextTrim) {
                            j++;
                            continue;
                        }
                        if (getIndent(nextLine) <= objIndent) break;
                        let propMatch = nextTrim.match(/^(\w+):\s*(.*)$/);
                        if (propMatch) {
                            let [, k2, v2] = propMatch;
                            if (!isNaN(Number(v2))) v2 = Number(v2);
                            obj[k2] = v2;
                        }
                        j++;
                    }
                    arr.push(obj);
                    iArr = j;
                } else if (lTrim.startsWith('- ')) {
                    let valueLine = lTrim.replace(/^- /, '');
                    let value;
                    if (!isNaN(Number(valueLine))) {
                        value = Number(valueLine);
                    } else if (valueLine === 'true' || valueLine === 'false') {
                        value = valueLine === 'true';
                    } else {
                        value = valueLine.replace(/^\"|\"$/g, '');
                    }
                    arr.push(value);
                    iArr++;
                } else {
                    iArr++;
                }
            }

            config[key] = arr;
            i = iArr;
            continue;
        }

        i++;
    }

    return config;
}
