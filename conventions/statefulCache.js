
const _delState = (obj, key) => error => {
	obj[key] = null;
	if (error) console.log(error.stack);
};

const _setState = (obj, key, oldState) => (error, newState) => process.nextTick(() => {
	obj[key] = newState;
	if (error) console.log(error.stack);
	oldState.forEach(callback => callback(error));
});

module.exports.getStatefulCache = (key, cache) => {
	const state = cache[key] = cache[key] == null ? [] : cache[key];
	const _set = state.length === 0 && _setState(cache, key, state);
	const _delete = !Array.isArray(state) && _delState(cache, key);
	const _await = Array.isArray(state) && (cb => state.push(cb));
	const value = !Array.isArray(state) && state;
	return [_await, _set, value, _delete];
};
