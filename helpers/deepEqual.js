// a deep equal algorithm specially written for xedux

function simpleDeepEqual(x, y) {
	// type
	if (typeof x !== typeof y) return false;

	// simple values, null, undefined
	if (typeof x !== 'object' || x === null || x === undefined || typeof x === 'boolean')
		return x === y;

	// array
	const xIsArr = Array.isArray(x);
	const yIsArr = Array.isArray(y);
	if (xIsArr !== yIsArr) return false;

	if (xIsArr && yIsArr) {
		if (x.length !== y.length) return false;
		for (let i = 0; i < x.length; i++) {
			if (!simpleDeepEqual(x[i], y[i])) return false;
		}
		return true;
	}

	// object
	if (typeof x === 'object') {
		const keysOfX = Object.keys(x);
		const keysOfY = Object.keys(y);
		if (!simpleDeepEqual(keysOfX, keysOfY)) return false;

		for (const key of keysOfX) {
			if (!simpleDeepEqual(x[key], y[key])) return false;
		}

		return true;
	}
}

export default simpleDeepEqual;
