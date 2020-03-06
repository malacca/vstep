export function formatTime(v){
    return v > 9 ? v : '0' +v;
}

export function formatRangeTime(v){
    if (!v || !(v instanceof Date)) {
        return '';
    }
    return formatTime(v.getHours()) + ':' + formatTime(v.getMinutes()) + ':' + formatTime(v.getSeconds());
}

export function toRangeTime(v, hour, min){
    if (typeof v === 'string' && v) {
        let h = hour, m = min, s = 0;
        v = v.split(':');

        h = parseInt(v[0]);
        h = isNaN(h) ? hour : h;

        if (v.length > 1) {
            m = parseInt(v[1]);
            m = isNaN(m) ? min : m;
        }

        if (v.length > 2) {
            s = parseInt(v[2]);
            s = isNaN(s) ? 0 : s;
        }
        return new Date(2016, 9, 10, h, m, s)
    }
    return '';
}

export function toSelectableRange(v){
    if (!v || typeof v !== 'string' || v.indexOf('-') === -1) {
        return false;
    }
    const range = v.split('-');
    if (range.length !== 2) {
        return false;
    }
    return [
        toRangeTime(range[0], 0, 0),
        toRangeTime(range[1], 23, 59)
    ]
}