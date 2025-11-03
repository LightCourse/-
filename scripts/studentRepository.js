(function initializeStudentRepository(global) {
    // Centralized student data access wrapper to keep Stage 2 logic consistent.
    const getFollowUpCollection = () => {
        const source = global.studentDataSource;
        if (!source || !Array.isArray(source.followUp)) {
            return [];
        }
        return source.followUp;
    };

    const cloneEntity = (entity) => {
        if (!entity) {
            return null;
        }
        if (typeof global.structuredClone === 'function') {
            return global.structuredClone(entity);
        }
        try {
            return JSON.parse(JSON.stringify(entity));
        } catch (error) {
            console.warn('StudentRepository: 深拷贝失败，返回原始引用', error);
            return entity;
        }
    };

    const getStudentDetails = (student) => {
        if (!student || !student.details) {
            return {
                autonomousPlan: [],
                selectedCourses: [],
                reports: []
            };
        }
        return {
            autonomousPlan: Array.isArray(student.details.autonomousPlan) ? student.details.autonomousPlan.map(cloneEntity) : [],
            selectedCourses: Array.isArray(student.details.selectedCourses) ? student.details.selectedCourses.map(cloneEntity) : [],
            reports: Array.isArray(student.details.reports) ? student.details.reports.map(cloneEntity) : []
        };
    };

    const textFromCell = (cell) => (cell ? cell.textContent.trim() : '');

    const makeUnitKey = (schoolName, courseCode) => `${schoolName || ''}::${courseCode || ''}`;

    const parseSeats = (value) => {
        const seats = parseInt(value, 10);
        return Number.isNaN(seats) ? null : seats;
    };

    const collectProductUnits = () => {
        if (typeof document === 'undefined') {
            return new Map();
        }

        const table = document.querySelector('#product-unit-management table');
        if (!table || !table.tBodies || !table.tBodies.length) {
            return new Map();
        }

        const rows = Array.from(table.tBodies[0].rows || []);
        const units = new Map();

        rows.forEach(row => {
            const cells = Array.from(row.cells);
            if (cells.length < 12) {
                return;
            }

            const textValues = cells.map(textFromCell);
            const entry = {
                coursePrice: textValues[0],
                schoolName: textValues[1],
                courseCode: textValues[2],
                courseName: textValues[3],
                startDate: textValues[6],
                endDate: textValues[7],
                seatsRemaining: parseSeats(textValues[8]),
                courseDuration: textValues[9],
                courseModality: textValues[10],
                academicTerm: textValues[11]
            };

            entry.isOnSale = entry.seatsRemaining !== null ? entry.seatsRemaining > 0 : false;
            units.set(makeUnitKey(entry.schoolName, entry.courseCode), entry);
        });

        return units;
    };

    const collectCourseMappings = () => {
        if (typeof document === 'undefined') {
            return [];
        }

        const table = document.querySelector('#product-course-mapping table');
        if (!table || !table.tBodies || !table.tBodies.length) {
            return [];
        }

        const rows = Array.from(table.tBodies[0].rows || []);
        const records = [];
        let context = {
            schoolName: '',
            courseCode: '',
            courseName: '',
            generalCategory: ''
        };

        rows.forEach(row => {
            const cells = Array.from(row.cells);
            if (!cells.length) {
                return;
            }

            if (cells.length >= 9) {
                context = {
                    schoolName: textFromCell(cells[0]) || context.schoolName,
                    courseCode: textFromCell(cells[1]) || context.courseCode,
                    courseName: textFromCell(cells[2]) || context.courseName,
                    generalCategory: textFromCell(cells[3]) || context.generalCategory
                };
            }

            const productSchool = textFromCell(cells[cells.length - 5] || null);
            const productCourseCode = textFromCell(cells[cells.length - 4] || null);
            const productCourseName = textFromCell(cells[cells.length - 3] || null);
            const alignmentStatus = textFromCell(cells[cells.length - 2] || null);
            const verificationOutcome = textFromCell(cells[cells.length - 1] || null);

            if (!context.schoolName || !context.courseCode || !productCourseCode) {
                return;
            }

            records.push({
                schoolName: context.schoolName,
                courseCode: context.courseCode,
                courseName: context.courseName,
                generalCategory: context.generalCategory,
                productSchool,
                productCourseCode,
                productCourseName,
                alignmentStatus,
                verificationOutcome
            });
        });

        return records;
    };

    const buildSelectedCoursesFromRuntime = (student, sharedCaches = {}) => {
        if (!student) {
            return [];
        }

        const details = getStudentDetails(student);
        const plan = Array.isArray(details.autonomousPlan) ? details.autonomousPlan : [];
        if (!plan.length) {
            return [];
        }

        const unitMap = sharedCaches.unitMap instanceof Map ? sharedCaches.unitMap : collectProductUnits();
        let mappingRecords = [];

        if (sharedCaches.mappingBySchool instanceof Map) {
            mappingRecords = sharedCaches.mappingBySchool.get(student.school) || [];
        } else if (Array.isArray(sharedCaches.allMappings)) {
            mappingRecords = sharedCaches.allMappings.filter(record => record.schoolName === student.school);
        } else {
            mappingRecords = collectCourseMappings().filter(record => record.schoolName === student.school);
        }

        return plan.map(planCourse => {
            const relevantRecords = mappingRecords.filter(record => record.courseCode === (planCourse.code || ''));
            const seenProducts = new Set();
            const productCourses = relevantRecords
                .filter(record => record.alignmentStatus === '对应')
                .reduce((acc, record) => {
                    const unitKey = makeUnitKey(record.productSchool, record.productCourseCode);
                    if (seenProducts.has(unitKey)) {
                        return acc;
                    }
                    seenProducts.add(unitKey);

                    const unit = unitMap.get(unitKey) || null;
                    const productEntry = {
                        code: record.productCourseCode,
                        name: unit?.courseName || record.productCourseName || '',
                        school: unit?.schoolName || record.productSchool || '',
                        startDate: unit?.startDate || '',
                        endDate: unit?.endDate || '',
                        price: unit?.coursePrice || '',
                        classCode: unit?.academicTerm || '',
                        duration: unit?.courseDuration || '',
                        modality: unit?.courseModality || '',
                        isOnSale: Boolean(unit?.isOnSale),
                        alignmentStatus: record.alignmentStatus || '',
                        verificationOutcome: record.verificationOutcome || ''
                    };

                    acc.push(productEntry);
                    return acc;
                }, []);

            const status = productCourses.some(product => product.isOnSale) ? 'serving' : 'potential';

            return {
                homeCourse: planCourse.code || '未命名课程',
                homeCourseName: planCourse.name || '',
                category: planCourse.category || '未分类',
                status,
                audit: 'notSubmitted',
                productCourses
            };
        });
    };

    const repository = {
        getAllFollowUps() {
            return getFollowUpCollection().map(cloneEntity);
        },

        getFollowUpById(studentId) {
            const target = getFollowUpCollection().find(student => String(student.id) === String(studentId));
            return cloneEntity(target);
        },

        findFollowUpByName(studentName) {
            if (!studentName) {
                return null;
            }
            const target = getFollowUpCollection().find(student => student.name === studentName);
            return cloneEntity(target);
        },

        getProfileSnapshot(studentName) {
            const student = this.findFollowUpByName(studentName);
            if (!student) {
                return {
                    name: studentName,
                    school: '未知学校',
                    creditTransfer: 'yes',
                    coursePurpose: ['graduation']
                };
            }

            const profile = student.profile || {};
            return {
                name: student.name,
                school: student.school,
                creditTransfer: profile.creditTransfer || 'yes',
                coursePurpose: Array.isArray(profile.coursePurpose) ? profile.coursePurpose.slice() : ['graduation']
            };
        },

        getStudentProfile(studentId) {
            const student = this.getFollowUpById(studentId);
            if (!student) {
                return null;
            }
            return {
                id: student.id,
                name: student.name,
                school: student.school,
                profile: cloneEntity(student.profile)
            };
        },

        getAutonomousPlan(studentId) {
            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            const details = getStudentDetails(student);
            return details.autonomousPlan;
        },

        getSelectedCourses(studentId) {
            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            if (!student) {
                return [];
            }

            const runtimeSelected = buildSelectedCoursesFromRuntime(student);
            if (runtimeSelected.length) {
                return runtimeSelected.map(cloneEntity);
            }

            const details = getStudentDetails(student);
            return details.selectedCourses;
        },

        getStudentServiceSnapshot() {
            const students = getFollowUpCollection();
            if (!Array.isArray(students) || !students.length) {
                return [];
            }

            const unitMap = collectProductUnits();
            const allMappings = collectCourseMappings();
            const mappingBySchool = allMappings.reduce((acc, record) => {
                if (!record || !record.schoolName) {
                    return acc;
                }
                if (!acc.has(record.schoolName)) {
                    acc.set(record.schoolName, []);
                }
                acc.get(record.schoolName).push(record);
                return acc;
            }, new Map());

            return students.reduce((entries, student) => {
                if (!student) {
                    return entries;
                }

                const runtimeSelected = buildSelectedCoursesFromRuntime(student, {
                    unitMap,
                    mappingBySchool
                });

                const selectedCourses = runtimeSelected.length
                    ? runtimeSelected
                    : getStudentDetails(student).selectedCourses;

                const normalizedCourses = Array.isArray(selectedCourses)
                    ? selectedCourses.reduce((acc, rawCourse) => {
                        const course = cloneEntity(rawCourse) || {};
                        const rawProducts = Array.isArray(rawCourse.productCourses)
                            ? rawCourse.productCourses
                            : [];
                        const seenProducts = new Set();

                        // Filter down to unique on-sale product units while hydrating with latest unit data.
                        const productCourses = rawProducts.reduce((list, rawProduct) => {
                            if (!rawProduct) {
                                return list;
                            }

                            const unitKey = makeUnitKey(rawProduct.school, rawProduct.code);
                            const unit = unitMap.get(unitKey);
                            const isOnSale = typeof rawProduct.isOnSale === 'boolean'
                                ? rawProduct.isOnSale
                                : Boolean(unit?.isOnSale);

                            if (!isOnSale) {
                                return list;
                            }

                            if (seenProducts.has(unitKey)) {
                                return list;
                            }
                            seenProducts.add(unitKey);

                            const productClone = cloneEntity(rawProduct) || {};
                            productClone.isOnSale = true;

                            if (unit) {
                                productClone.name = unit.courseName || productClone.name || '';
                                productClone.school = unit.schoolName || productClone.school || '';
                                productClone.startDate = unit.startDate || productClone.startDate || '';
                                productClone.endDate = unit.endDate || productClone.endDate || '';
                                productClone.modality = unit.courseModality || productClone.modality || '';
                                productClone.duration = unit.courseDuration || productClone.duration || '';
                                productClone.classCode = unit.academicTerm || productClone.classCode || '';
                                productClone.price = unit.coursePrice || productClone.price || '';
                            }

                            list.push(productClone);
                            return list;
                        }, []);

                        if (!productCourses.length) {
                            return acc;
                        }

                        course.productCourses = productCourses;
                        acc.push(course);
                        return acc;
                    }, [])
                    : [];

                if (!normalizedCourses.length) {
                    return entries;
                }

                entries.push({
                    student: {
                        id: student.id,
                        name: student.name,
                        school: student.school,
                        status: cloneEntity(student.status)
                    },
                    courses: normalizedCourses
                });

                return entries;
            }, []);
        },

        getReports(studentId) {
            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            const details = getStudentDetails(student);
            return details.reports;
        },

        getSubscriptions(studentId) {
            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            if (!student || !Array.isArray(student.subscriptions)) {
                return [];
            }
            return student.subscriptions.map(cloneEntity);
        }
    };

    global.StudentRepository = Object.freeze(repository);
})(window);
