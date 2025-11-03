(function initializeStudentData(global) {
    const createAutonomousPlan = () => ([
        {
            code: "MATH 21A",
            name: "Multivariable Calculus",
            category: "数学与逻辑推理",
            correspondences: 20,
            courseType: "lecture",
            availableUnits: 153
        },
        {
            code: "CHEM 17",
            name: "Principles of General Chemistry",
            category: "自然科学",
            correspondences: 15,
            courseType: "lecture",
            availableUnits: 87
        },
        {
            code: "PSYC 1",
            name: "Introduction to Psychology",
            category: "社会科学",
            correspondences: 12,
            courseType: "lecture",
            availableUnits: 92
        },
        {
            code: "ENGL 10A",
            name: "Expository Writing",
            category: "语言文学",
            correspondences: 8,
            courseType: "studio",
            availableUnits: 67
        }
    ]);

    const createPennStateAutonomousPlan = () => ([
        {
            code: "MATH 240P",
            name: "Multivariable Calculus",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "MATH 141P",
            name: "Calculus II",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 102P",
            name: "Introductory Microeconomics",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 302P",
            name: "Intermediate Microeconomic Analysis",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 100P",
            name: "Introductory Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 260P",
            name: "Cognitive Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        }
    ]);

    const createSelectedCourses = () => ([
        {
            homeCourse: "MATH 21A",
            category: "专业必修课",
            status: "serving",
            audit: "aiPassed",
            productCourses: [
                {
                    code: "MATH 2210",
                    name: "Multivariable Calculus",
                    school: "University of Toronto",
                    startDate: "2025-10-20",
                    endDate: "2025-12-13",
                    price: "1500美元",
                    classCode: "001",
                    duration: "8周"
                },
                {
                    code: "MATH 264",
                    name: "Vector Calculus",
                    school: "McGill University",
                    startDate: "2025-11-05",
                    endDate: "2025-12-28",
                    price: "1380美元",
                    classCode: "002",
                    duration: "8周"
                }
            ]
        },
        {
            homeCourse: "CHEM 17",
            category: "专业必修课",
            status: "potential",
            audit: "notSubmitted",
            productCourses: [
                {
                    code: "CHEM 1000",
                    name: "Chemical Principles",
                    school: "University of British Columbia",
                    startDate: "2025-11-12",
                    endDate: "2026-02-15",
                    price: "1680美元",
                    classCode: "003",
                    duration: "14周"
                }
            ]
        },
        {
            homeCourse: "PSYC 1",
            category: "通识课",
            status: "serving",
            audit: "aiPassed",
            productCourses: [
                {
                    code: "PSYC 100",
                    name: "Introduction to Psychology",
                    school: "Stanford University",
                    startDate: "2025-10-28",
                    endDate: "2025-12-20",
                    price: "1420美元",
                    classCode: "004",
                    duration: "8周"
                },
                {
                    code: "PSYC 1001",
                    name: "Psychology Fundamentals",
                    school: "University of Toronto",
                    startDate: "2025-11-15",
                    endDate: "2026-01-10",
                    price: "1350美元",
                    classCode: "005",
                    duration: "8周"
                }
            ]
        }
    ]);

    const createReports = () => ([
        {
            id: "report-initial",
            title: "初次评估报告",
            createdAt: "2024-10-20",
            status: "completed",
            description: "涵盖学生背景、课程诉求以及初步课程建议"
        },
        {
            id: "report-followup",
            title: "阶段性跟进记录",
            createdAt: "2024-11-03",
            status: "inProgress",
            description: "记录当前服务进展、课程匹配与待定事项"
        }
    ]);

    const createSubscriptions = () => ([
        {
            id: "sub-chemmatched",
            type: "product",
            course: {
                code: "MATH 2210",
                name: "Multivariable Calculus",
                school: "University of Toronto"
            },
            status: "matched",
            deadline: "2025-12-15",
            summary: "2025-Fall, 线上直播",
            term: "2025-Fall",
            modality: "线上直播",
            duration: "≥8周",
            price: "≤1600美元",
            createdAt: "2025-09-10"
        },
        {
            id: "sub-chempending",
            type: "product",
            course: {
                code: "CHEM 1000",
                name: "Chemical Principles",
                school: "University of British Columbia"
            },
            status: "waiting",
            deadline: "2025-11-05",
            summary: "2025-Winter, 线下",
            term: "2025-Winter",
            modality: "线下",
            duration: "12-16周",
            price: "≤2000美元",
            createdAt: "2025-08-15",
            warning: "剩7天"
        },
        {
            id: "sub-psych-notified",
            type: "home",
            course: {
                code: "PSYC 1",
                name: "Introduction to Psychology",
                school: "Harvard University"
            },
            status: "notified",
            deadline: "2025-12-20",
            summary: "任意学期, 不限形式",
            term: "任意学期",
            modality: "不限",
            duration: "不限",
            price: "≤1500美元",
            createdAt: "2025-07-20"
        }
    ]);

    const followUpStudents = [
        {
            id: "1",
            name: "张明",
            school: "The Pennsylvania State University Park",
            entryTime: "2024-10-15 14:30",
            nextFollow: "2024-10-28 10:00",
            status: {
                code: "pending",
                label: "待跟进",
                badgeClass: "status-pending"
            },
            wechatName: "明明学习",
            report: { available: true },
            subscriptions: createSubscriptions(),
            profile: {
                creditTransfer: "yes",
                coursePurpose: ["graduation", "gradschool"]
            },
            details: {
                autonomousPlan: createPennStateAutonomousPlan(),
                selectedCourses: createSelectedCourses(),
                reports: createReports()
            }
        },
        {
            id: "2",
            name: "李小雨",
            school: "University of Illinois Urbana-Champaign",
            entryTime: "2024-10-18 09:20",
            nextFollow: "2024-10-29 15:30",
            status: {
                code: "following",
                label: "跟进中",
                badgeClass: "status-following"
            },
            wechatName: "雨天学习",
            report: { available: true },
            subscriptions: createSubscriptions(),
            profile: {
                creditTransfer: "no",
                coursePurpose: ["transfer", "studyabroad"]
            },
            details: {
                autonomousPlan: createAutonomousPlan(),
                selectedCourses: createSelectedCourses(),
                reports: createReports()
            }
        },
        {
            id: "3",
            name: "王晓华",
            school: "University of Wisconsin-Madison",
            entryTime: "2024-10-20 16:45",
            nextFollow: "2024-10-30 11:00",
            status: {
                code: "completed",
                label: "已完成",
                badgeClass: "status-completed"
            },
            wechatName: "小华同学",
            report: { available: true },
            subscriptions: createSubscriptions(),
            profile: {
                creditTransfer: "yes",
                coursePurpose: ["graduation"]
            },
            details: {
                autonomousPlan: createAutonomousPlan(),
                selectedCourses: createSelectedCourses(),
                reports: createReports()
            }
        },
        {
            id: "4",
            name: "陈思远",
            school: "University of California, Davis",
            entryTime: "2024-10-22 13:15",
            nextFollow: "2024-10-31 14:00",
            status: {
                code: "pending",
                label: "待跟进",
                badgeClass: "status-pending"
            },
            wechatName: "思远学子",
            report: { available: true },
            subscriptions: createSubscriptions(),
            profile: {
                creditTransfer: "yes",
                coursePurpose: ["graduation", "transfer", "gradschool"]
            },
            details: {
                autonomousPlan: createAutonomousPlan(),
                selectedCourses: createSelectedCourses(),
                reports: createReports()
            }
        },
        {
            id: "5",
            name: "刘佳妮",
            school: "University of California, Los Angeles",
            entryTime: "2024-10-25 10:30",
            nextFollow: "2024-11-01 09:30",
            status: {
                code: "following",
                label: "跟进中",
                badgeClass: "status-following"
            },
            wechatName: "佳妮加油",
            report: { available: true },
            subscriptions: createSubscriptions(),
            profile: {
                creditTransfer: "no",
                coursePurpose: ["gradschool", "studyabroad"]
            },
            details: {
                autonomousPlan: createAutonomousPlan(),
                selectedCourses: createSelectedCourses(),
                reports: createReports()
            }
        }
    ];

    global.studentDataSource = Object.freeze({
        followUp: followUpStudents
    });
})(window);
