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

    const createUIUCAutonomousPlan = () => ([
        {
            code: "MATH 241U",
            name: "Calculus III",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "MATH 231U",
            name: "Calculus II",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 102U",
            name: "Microeconomic Principles",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 203U",
            name: "Economic Statistics I",
            category: "Statistics and Data Literacy",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYC 100U",
            name: "Introduction to Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYC 238U",
            name: "Abnormal Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        }
    ]);

    const createWisconsinMadisonAutonomousPlan = () => ([
        {
            code: "MATH 234W",
            name: "Calculus-Functions of Several Variables",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "MATH 222W",
            name: "Calculus and Analytic Geometry II",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 101W",
            name: "Principles of Microeconomics",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 301W",
            name: "Intermediate Microeconomics",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 202W",
            name: "Introduction to Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 225W",
            name: "Cognition",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        }
    ]);

    const createUCDavisAutonomousPlan = () => ([
        {
            code: "MAT 21A D",
            name: "Differential Calculus",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "MAT 21B D",
            name: "Integral Calculus",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECN 1A D",
            name: "Principles of Microeconomics",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECN 102 D",
            name: "Analysis of Microeconomic Data",
            category: "Statistics and Data Literacy",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSC 1 D",
            name: "General Psychology",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSC 121 D",
            name: "Human Emotion",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        }
    ]);

    const createUCLAAutonomousPlan = () => ([
        {
            code: "MATH 31A L",
            name: "Differential and Integral Calculus",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "MATH 31B L",
            name: "Integration and Infinite Series",
            category: "Quantitative Reasoning",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 11 L",
            name: "Microeconomic Theory",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "ECON 101 L",
            name: "Price Theory",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 10 L",
            name: "Introduction to Behavioral Science",
            category: "Social and Behavioral Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        },
        {
            code: "PSYCH 115 L",
            name: "Principles of Behavioral Neuroscience",
            category: "Natural Sciences",
            correspondences: "",
            courseType: "",
            availableUnits: ""
        }
    ]);

    const emptySelectedCourses = () => ([]);

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
            createdAt: "2025-09-10",
            createdAtIso: "2025-09-10T09:00:00Z",
            submissionMode: "form",
            formSnapshot: {
                semester: "2025-Fall",
                format: "online",
                durationMin: "8",
                durationMax: "16",
                priceMax: "1600",
                currency: "USD"
            },
            history: [
                {
                    action: "created",
                    timestamp: "2025-09-10T09:00:00Z",
                    actor: "张明",
                    details: {
                        submissionMode: "form",
                        courseCode: "MATH 2210"
                    }
                },
                {
                    action: "status-updated",
                    timestamp: "2025-10-01T08:30:00Z",
                    actor: "系统",
                    details: {
                        from: "waiting",
                        to: "matched"
                    }
                }
            ],
            metadata: {
                courseDisplay: "MATH 2210(Multivariable Calculus)",
                createdAtIso: "2025-09-10T09:00:00Z",
                deadlineSource: "form"
            }
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
            createdAtIso: "2025-08-15T10:00:00Z",
            submissionMode: "form",
            formSnapshot: {
                semester: "2025-Winter",
                format: "offline",
                durationMin: "12",
                durationMax: "16",
                priceMax: "2000",
                currency: "USD"
            },
            history: [
                {
                    action: "created",
                    timestamp: "2025-08-15T10:00:00Z",
                    actor: "张明",
                    details: {
                        submissionMode: "form",
                        courseCode: "CHEM 1000"
                    }
                }
            ],
            metadata: {
                courseDisplay: "CHEM 1000(Chemical Principles)",
                createdAtIso: "2025-08-15T10:00:00Z",
                deadlineSource: "form"
            },
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
            createdAt: "2025-07-20",
            createdAtIso: "2025-07-20T14:20:00Z",
            submissionMode: "direct",
            history: [
                {
                    action: "created",
                    timestamp: "2025-07-20T14:20:00Z",
                    actor: "张明",
                    details: {
                        submissionMode: "direct",
                        courseCode: "PSYC 1"
                    }
                },
                {
                    action: "status-updated",
                    timestamp: "2025-08-02T09:15:00Z",
                    actor: "系统",
                    details: {
                        from: "waiting",
                        to: "notified"
                    }
                }
            ],
            metadata: {
                courseDisplay: "PSYC 1(Introduction to Psychology)",
                createdAtIso: "2025-07-20T14:20:00Z",
                deadlineSource: "manual"
            }
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
                selectedCourses: emptySelectedCourses(),
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
                autonomousPlan: createUIUCAutonomousPlan(),
                selectedCourses: emptySelectedCourses(),
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
                autonomousPlan: createWisconsinMadisonAutonomousPlan(),
                selectedCourses: emptySelectedCourses(),
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
                autonomousPlan: createUCDavisAutonomousPlan(),
                selectedCourses: emptySelectedCourses(),
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
                autonomousPlan: createUCLAAutonomousPlan(),
                selectedCourses: emptySelectedCourses(),
                reports: createReports()
            }
        }
    ];

    global.studentDataSource = Object.freeze({
        followUp: followUpStudents
    });
})(window);
