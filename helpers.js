function arrayAreSame(arr1, arr2) {
	if (arr1.length !== arr2.length) return false;
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}
	return true;
}

export const hasCyclicDeps = (currentSnap, history) => {
	for (const snapshot of history) {
		if (arrayAreSame(snapshot, currentSnap)) return true;
	}
	return false;
};

// can deep clone any combination of simple values, arrays and objects
export const simpleDeepClone = x => {
	// simple value type
	if (typeof x !== 'object') return x;

	// array
	if (Array.isArray(x)) {
		const clone = [];
		x.forEach(value => {
			clone.push(simpleDeepClone(value));
		});

		return clone;
	}

	// object
	if (typeof x === 'object') {
		const clone = {};
		for (const key in x) {
			clone[key] = simpleDeepClone(x[key]);
		}

		return clone;
	}

	throw new Error(
		`simple deep clone can not clone data of type "${typeof x}". Do not mutate ${JSON.stringify(
			x
		)}, instead perform an immutative update by returning the new value`
	);
};
