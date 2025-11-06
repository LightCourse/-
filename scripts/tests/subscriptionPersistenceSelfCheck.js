/* Step 4 persistence self-check: verifies localStorage key migration and failure fallback */
const path = require('path');

const globalScope = global;

typeof globalScope.window === 'undefined' && (globalScope.window = globalScope);

globalScope.document = {
    querySelector() {
        return null;
    }
};

globalScope.console = globalScope.console || {};
const originalWarn = globalScope.console.warn ? globalScope.console.warn.bind(globalScope.console) : null;
const warnMessages = [];
globalScope.console.warn = function(...args) {
    warnMessages.push(args.map(String).join(' '));
    if (originalWarn) {
        originalWarn(...args);
    }
};

const createLocalStorageMock = () => {
    const store = new Map();
    return {
        shouldFail: false,
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            if (this.shouldFail) {
                throw new Error('forced-write-failure');
            }
            store.set(String(key), String(value));
        },
        removeItem(key) {
            if (this.shouldFail) {
                throw new Error('forced-remove-failure');
            }
            store.delete(String(key));
        },
        clear() {
            store.clear();
        },
        key(index) {
            return Array.from(store.keys())[index] || null;
        },
        get length() {
            return store.size;
        },
        has(key) {
            return store.has(String(key));
        },
        snapshot() {
            return Array.from(store.entries()).map(([k, v]) => ({ key: k, value: v }));
        }
    };
};

globalScope.localStorage = createLocalStorageMock();

const initialSubscription = {
    id: 'legacy-sub-1',
    type: 'product',
    status: 'waiting',
    course: { code: 'COURSE100', name: 'Legacy Course', school: 'Legacy School' },
    summary: 'from legacy store'
};

globalScope.localStorage.setItem(
    'subscription-center:stu-1',
    JSON.stringify([initialSubscription])
);

globalScope.studentDataSource = {
    followUp: [
        {
            id: 'stu-1',
            name: 'Self Check Student',
            school: 'Legacy School',
            subscriptions: []
        }
    ]
};

globalScope.AppConfig = {
    subscription: {
        enableDemoData: false,
        persistence: 'localStorage'
    }
};

require(path.resolve(__dirname, '../studentRepository.js'));

const repository = globalScope.StudentRepository;

const migratedList = repository.getSubscriptions('stu-1', { includeDemo: false });
const migrationResult = {
    migratedCount: migratedList.length,
    containsLegacy: migratedList.some(sub => sub.id === 'legacy-sub-1'),
    legacyKeyExists: globalScope.localStorage.has('subscription-center:stu-1'),
    primaryKeyExists: globalScope.localStorage.has('subscription:stu-1')
};

globalScope.localStorage.shouldFail = true;

let fallbackResult = {
    succeeded: true,
    newSubscriptionPersisted: false
};

try {
    repository.addSubscription('stu-1', {
        id: 'dynamic-sub-2',
        type: 'product',
        status: 'waiting',
        course: {
            code: 'COURSE200',
            name: 'Dynamic Course',
            school: 'Legacy School'
        },
        summary: 'dynamic entry'
    });
} catch (error) {
    fallbackResult.succeeded = false;
    fallbackResult.error = error && error.message;
}

globalScope.localStorage.shouldFail = false;

const finalList = repository.getSubscriptions('stu-1', { includeDemo: false });
fallbackResult.newSubscriptionPersisted = finalList.some(sub => sub.id === 'dynamic-sub-2');

const report = {
    migrationResult,
    fallbackResult,
    warnMessages
};

console.log(JSON.stringify(report, null, 2));
