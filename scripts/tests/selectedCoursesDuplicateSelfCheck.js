const path = require('path');

const globalScope = global;
typeof globalScope.window === 'undefined' && (globalScope.window = globalScope);

globalScope.document = {
    querySelector() {
        return null;
    }
};

globalScope.console = globalScope.console || {};
const warnLogs = [];
const originalWarn = typeof globalScope.console.warn === 'function'
    ? globalScope.console.warn.bind(globalScope.console)
    : null;
globalScope.console.warn = function(...args) {
    warnLogs.push(args.map(String).join(' '));
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
            id: 'stu-duplicate-demo',
            name: 'Duplicate Demo Student',
            school: 'The Pennsylvania State University Park',
            details: {
                autonomousPlan: [],
                selectedCourses: []
            }
        }
    ]
};

require(path.resolve(__dirname, '../studentRepository.js'));

const repository = globalScope.StudentRepository;
const studentId = 'stu-duplicate-demo';

const basePayload = {
    source: 'product',
    courseCode: 'MATH 240P',
    courseName: 'Multivariable Calculus',
    productCourseCode: 'MATH 227S',
    productCourseName: 'Calculus II',
    schoolName: 'San Francisco State University',
    allowDuplicate: true
};

const firstResult = repository.addCourseToSelected(studentId, { ...basePayload });
const secondResult = repository.addCourseToSelected(studentId, { ...basePayload });
const selectedList = repository.getSelectedCourses(studentId, { forceRefresh: true });

const summary = {
    firstResult,
    secondResult,
    selectedCount: selectedList.length,
    ids: selectedList.map(entry => entry.id),
    duplicateFlags: selectedList.map(entry => Boolean(entry?.metadata?.demoDuplicate)),
    warnLogs
};

console.log(JSON.stringify(summary, null, 2));
