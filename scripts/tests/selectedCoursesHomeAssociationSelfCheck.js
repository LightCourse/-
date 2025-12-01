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
            id: 'stu-home-assoc',
            name: 'Home Association Demo',
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
const studentId = 'stu-home-assoc';

const payload = {
    source: 'home',
    courseCode: 'PSYC 1',
    courseName: 'Introduction to Psychology',
    homeCourseCode: 'PSYC 1',
    homeCourseName: 'Introduction to Psychology',
    productCourseCode: 'PSYC 227S',
    productCourseName: 'Social Psychology',
    schoolName: 'Harvard University'
};

const result = repository.addCourseToSelected(studentId, payload);
const selectedCourses = repository.getSelectedCourses(studentId, { forceRefresh: true });

const entry = selectedCourses[0] || null;

const summary = {
    addSuccess: result?.success === true,
    selectedCount: selectedCourses.length,
    homeCourse: entry ? entry.homeCourse : null,
    homeCourseName: entry ? entry.homeCourseName : null,
    courseCode: entry ? entry.courseCode : null,
    courseName: entry ? entry.courseName : null,
    productCourses: entry ? entry.productCourses : [],
    warnLogs
};

console.log(JSON.stringify(summary, null, 2));
