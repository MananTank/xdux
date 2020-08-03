// a cloning algorithm specially written for xedux
const simpleDeepClone = x => {
	// simple value type
	if (typeof x !== 'object') return x;

	// array
	if (Array.isArray(x)) {
		const xClone = [];
		x.forEach(value => {
			xClone.push(simpleDeepClone(value));
		});

		return xClone;
	}

	// object
	if (typeof x === 'object') {
		const xClone = {};
		for (const key in x) {
			xClone[key] = simpleDeepClone(x[key]);
		}

		return xClone;
	}

	throw new Error(
		`simple deep clone can not clone data of type "${typeof x}". Do not mutate ${JSON.stringify(
			x
		)}, instead perform an immutative update by returning the new value`
	);
};

export default simpleDeepClone;
