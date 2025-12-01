const path = require('path');

const globalScope = global;
typeof globalScope.window === 'undefined' && (globalScope.window = globalScope);

globalScope.document = {
    querySelector() {
        return null;
    }
};

globalScope.console = globalScope.console || {};
const mergeWarnLogs = [];
const originalWarn = typeof globalScope.console.warn === 'function'
    ? globalScope.console.warn.bind(globalScope.console)
    : null;
globalScope.console.warn = function(...args) {
    mergeWarnLogs.push(args.map(String).join(' '));
    if (originalWarn) {
        originalWarn(...args);
    }
};

globalScope.AppConfig = {
    subscription: {
        enableDemoData: false,
        persistence: 'memory'
    },
    selectedCourses: {
        prefillProductCourses: true
    }
};

globalScope.studentDataSource = {
    followUp: [
        {
            id: 'stu-merge-demo',
            name: 'Merge Demo Student',
            school: 'The Pennsylvania State University Park',
            details: {
                autonomousPlan: [
                    {
                        code: 'MATH 240P',
                        name: 'Multivariable Calculus',
                        category: 'Quantitative Reasoning'
                    }
                ],
                selectedCourses: []
            }
        }
    ]
};

require(path.resolve(__dirname, '../studentRepository.js'));

const repository = globalScope.StudentRepository;
const studentId = 'stu-merge-demo';

const payload = {
    source: 'product',
    courseCode: 'MATH 240P',
    courseName: 'Multivariable Calculus',
    productCourseCode: 'MATH 227S',
    productCourseName: 'Calculus II',
    schoolName: 'San Francisco State University',
    allowDuplicate: true
};

repository.addCourseToSelected(studentId, { ...payload });
repository.addCourseToSelected(studentId, { ...payload });

const selectedCourses = repository.getSelectedCourses(studentId, { forceRefresh: true });

const demoDuplicateEntries = selectedCourses.filter(entry => entry?.metadata?.demoDuplicate === true);
const runtimeEntries = selectedCourses.filter(entry => !entry?.metadata?.demoDuplicate);

const summary = {
    selectedCount: selectedCourses.length,
    demoDuplicateCount: demoDuplicateEntries.length,
    runtimeCount: runtimeEntries.length,
    ids: selectedCourses.map(entry => entry.id),
    runtimeSources: runtimeEntries.map(entry => entry.source || null),
    mergeWarnLogs
};

console.log(JSON.stringify(summary, null, 2));
