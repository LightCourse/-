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

    const subscriptionBlueprint = Object.freeze({
        required: ['id', 'type', 'status', 'course'],
        optional: [
            'deadline',
            'summary',
            'term',
            'modality',
            'duration',
            'price',
            'createdAt',
            'warning',
            'formSnapshot',
            'submissionMode',
            'history',
            'lastRenewedAt',
            'lastRenewedBy',
            'metadata',
            'createdAtIso'
        ]
    });

    const subscriptionErrorTypes = Object.freeze({
        invalidPayload: 'subscription/invalid-payload',
        duplicateEntry: 'subscription/duplicate-entry',
        notFound: 'subscription/not-found',
        storageFailure: 'subscription/storage-failure'
    });

    class SubscriptionRepositoryError extends Error {
        constructor(code, message, context) {
            super(message || code);
            this.name = 'SubscriptionRepositoryError';
            this.code = code;
            if (context && typeof context === 'object') {
                this.context = context;
            }
        }
    }

    const subscriptionDefaults = Object.freeze({
        type: 'product',
        status: 'waiting'
    });

    const subscriptionStatusSet = new Set([
        'waiting',
        'matched',
        'notified',
        'viewed',
        'converted',
        'expired',
        'cancelled'
    ]);

    const submissionModeSet = new Set(['direct', 'form']);

    const historyActionSet = new Set([
        'created',
        'edited',
        'renewed',
        'cancelled',
        'status-updated'
    ]);

    const subscriptionTypeSet = new Set(['product', 'home']);

    let subscriptionIdSeed = Date.now();

    const ensureSubscriptionId = (subscription, studentId) => {
        if (subscription && typeof subscription.id === 'string' && subscription.id.trim()) {
            return subscription.id.trim();
        }
        subscriptionIdSeed += 1;
        const baseStudentId = typeof studentId === 'undefined' ? 'unknown' : String(studentId).trim() || 'unknown';
        return `sub-${baseStudentId}-${subscriptionIdSeed}`;
    };

    const toClonedObject = (source) => {
        if (!source || typeof source !== 'object') {
            return {};
        }
        return cloneEntity(source) || {};
    };

    const parseDateInput = (value) => {
        if (!value || typeof value !== 'string') {
            return null;
        }

        const parts = value.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts.map(part => parseInt(part, 10));
            if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                return new Date(Date.UTC(year, month - 1, day));
            }
        }

        const direct = new Date(value);
        if (Number.isNaN(direct.getTime())) {
            return null;
        }
        return direct;
    };

    const formatDateOutput = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0];
    };

    const addDays = (date, days) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }
        const clone = new Date(date.getTime());
        clone.setUTCDate(clone.getUTCDate() + days);
        return clone;
    };

    const normalizeFormSnapshot = (snapshot) => {
        if (!snapshot || typeof snapshot !== 'object') {
            return null;
        }
        return cloneEntity(snapshot);
    };

    const normalizeHistoryEntry = (entry) => {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const action = typeof entry.action === 'string' && historyActionSet.has(entry.action)
            ? entry.action
            : null;
        if (!action) {
            return null;
        }

        const timestamp = typeof entry.timestamp === 'string' && entry.timestamp
            ? entry.timestamp
            : new Date().toISOString();

        const actor = typeof entry.actor === 'string' ? entry.actor : '';
        const details = entry.details && typeof entry.details === 'object'
            ? cloneEntity(entry.details)
            : undefined;

        return {
            action,
            timestamp,
            actor,
            details
        };
    };

    const normalizeCourseSnapshot = (course = {}) => {
        const fallback = { code: '', name: '', school: '' };
        if (!course || typeof course !== 'object') {
            return fallback;
        }
        return {
            code: typeof course.code === 'string' ? course.code : fallback.code,
            name: typeof course.name === 'string' ? course.name : fallback.name,
            school: typeof course.school === 'string' ? course.school : fallback.school
        };
    };

    const normalizeSubscriptionSnapshot = (subscription, studentId) => {
        const snapshot = cloneEntity(subscription) || {};

        snapshot.id = ensureSubscriptionId(snapshot, studentId);

        const normalizedType = typeof snapshot.type === 'string' && subscriptionTypeSet.has(snapshot.type)
            ? snapshot.type
            : subscriptionDefaults.type;
        snapshot.type = normalizedType;

        const normalizedStatus = typeof snapshot.status === 'string' && subscriptionStatusSet.has(snapshot.status)
            ? snapshot.status
            : subscriptionDefaults.status;
        snapshot.status = normalizedStatus;

        snapshot.course = normalizeCourseSnapshot(snapshot.course);

        const normalizedForm = normalizeFormSnapshot(snapshot.formSnapshot);
        snapshot.formSnapshot = normalizedForm;

        const submissionMode = typeof snapshot.submissionMode === 'string' && submissionModeSet.has(snapshot.submissionMode)
            ? snapshot.submissionMode
            : (normalizedForm ? 'form' : 'direct');
        snapshot.submissionMode = submissionMode;

        const historyEntries = Array.isArray(snapshot.history)
            ? snapshot.history.map(normalizeHistoryEntry).filter(Boolean)
            : [];
        snapshot.history = historyEntries;

        snapshot.lastRenewedAt = typeof snapshot.lastRenewedAt === 'string' ? snapshot.lastRenewedAt : '';
        snapshot.lastRenewedBy = typeof snapshot.lastRenewedBy === 'string' ? snapshot.lastRenewedBy : '';
        if (typeof snapshot.createdAt === 'string' && snapshot.createdAt) {
            snapshot.createdAt = snapshot.createdAt;
        } else if (typeof snapshot.createdAtIso === 'string' && snapshot.createdAtIso) {
            snapshot.createdAt = snapshot.createdAtIso.split('T')[0];
        } else {
            snapshot.createdAt = '';
        }
        snapshot.createdAtIso = typeof snapshot.createdAtIso === 'string' ? snapshot.createdAtIso : '';

        if (snapshot.metadata && typeof snapshot.metadata === 'object') {
            snapshot.metadata = cloneEntity(snapshot.metadata);
        } else {
            snapshot.metadata = {};
        }

        let deadlineValue = typeof snapshot.deadline === 'string' ? snapshot.deadline.trim() : '';
        if (!deadlineValue) {
            const createdDate = parseDateInput(snapshot.createdAt)
                || parseDateInput(snapshot.createdAtIso)
                || null;
            const fallbackDeadline = createdDate ? addDays(createdDate, 180) : null;
            if (fallbackDeadline) {
                deadlineValue = formatDateOutput(fallbackDeadline);
                if (!snapshot.metadata.deadlineSource) {
                    snapshot.metadata.deadlineSource = 'auto-180';
                }
            }
        }
        snapshot.deadline = deadlineValue;

        return snapshot;
    };

    const validateSubscriptionPayload = (payload) => {
        if (!payload || typeof payload !== 'object') {
            throw new SubscriptionRepositoryError(
                subscriptionErrorTypes.invalidPayload,
                '订阅数据必须是对象'
            );
        }

        subscriptionBlueprint.required.forEach(field => {
            if (field === 'id' || field === 'type' || field === 'status') {
                return;
            }
            if (payload[field] === undefined || payload[field] === null) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    `订阅字段缺失: ${field}`,
                    { field }
                );
            }
        });

        if (payload.status && !subscriptionStatusSet.has(payload.status)) {
            throw new SubscriptionRepositoryError(
                subscriptionErrorTypes.invalidPayload,
                `未知的订阅状态: ${payload.status}`,
                { status: payload.status }
            );
        }

        if (payload.type && !subscriptionTypeSet.has(payload.type)) {
            throw new SubscriptionRepositoryError(
                subscriptionErrorTypes.invalidPayload,
                `未知的订阅类型: ${payload.type}`,
                { type: payload.type }
            );
        }

        const course = payload.course;
        if (!course || typeof course !== 'object') {
            throw new SubscriptionRepositoryError(
                subscriptionErrorTypes.invalidPayload,
                '订阅缺少课程信息',
                { field: 'course' }
            );
        }

        ['code', 'name'].forEach(prop => {
            if (typeof course[prop] !== 'string' || !course[prop]) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    `课程字段缺失: course.${prop}`,
                    { field: `course.${prop}` }
                );
            }
        });
    };

    const getStudentForMutation = (studentId) => {
        const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
        if (!student) {
            throw new SubscriptionRepositoryError(
                subscriptionErrorTypes.notFound,
                `未找到学生 ${studentId}`,
                { studentId }
            );
        }
        if (!Array.isArray(student.subscriptions)) {
            student.subscriptions = [];
        }
        return student;
    };

    const findSubscriptionIndex = (list, subscriptionId) => {
        return list.findIndex(item => String(item?.id) === String(subscriptionId));
    };

    const createEventBus = () => {
        const listeners = new Map();

        const getListeners = (eventName) => {
            if (!listeners.has(eventName)) {
                listeners.set(eventName, new Set());
            }
            return listeners.get(eventName);
        };

        return {
            on(eventName, handler) {
                if (typeof handler !== 'function') {
                    return () => {};
                }
                const eventListeners = getListeners(eventName);
                eventListeners.add(handler);
                return () => {
                    eventListeners.delete(handler);
                };
            },
            off(eventName, handler) {
                if (!listeners.has(eventName) || typeof handler !== 'function') {
                    return;
                }
                listeners.get(eventName).delete(handler);
            },
            emit(eventName, payload) {
                if (!listeners.has(eventName)) {
                    return;
                }
                listeners.get(eventName).forEach(listener => {
                    try {
                        listener(payload);
                    } catch (error) {
                        console.warn('StudentRepository: 事件监听执行失败', { eventName, error });
                    }
                });
            }
        };
    };

    const eventBus = createEventBus();

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
            return student.subscriptions.map(subscription => normalizeSubscriptionSnapshot(subscription, studentId));
        },

        updateSubscriptionConditions(studentId, subscriptionId, options = {}) {
            const student = getStudentForMutation(studentId);
            const index = findSubscriptionIndex(student.subscriptions, subscriptionId);

            if (index < 0) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const current = normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
            const actor = typeof options.actor === 'string' ? options.actor : '';
            const nowIso = new Date().toISOString();

            const updatedSnapshot = {
                ...current,
                term: options.term !== undefined ? options.term : current.term,
                modality: options.modality !== undefined ? options.modality : current.modality,
                duration: options.duration !== undefined ? options.duration : current.duration,
                price: options.price !== undefined ? options.price : current.price,
                deadline: options.deadline !== undefined ? options.deadline : current.deadline,
                summary: options.summary !== undefined ? options.summary : current.summary,
                submissionMode: options.submissionMode || current.submissionMode,
                formSnapshot: options.formSnapshot === undefined
                    ? current.formSnapshot
                    : normalizeFormSnapshot(options.formSnapshot),
                metadata: {
                    ...toClonedObject(current.metadata),
                    ...toClonedObject(options.metadata)
                }
            };

            const changedFields = Array.isArray(options.changedFields) ? options.changedFields.slice() : [];
            const historyEntry = normalizeHistoryEntry({
                action: 'edited',
                timestamp: nowIso,
                actor,
                details: {
                    changedFields,
                    submissionMode: updatedSnapshot.submissionMode,
                    summary: updatedSnapshot.summary,
                    deadline: updatedSnapshot.deadline
                }
            });

            updatedSnapshot.history = historyEntry
                ? current.history.concat(historyEntry)
                : current.history.slice();

            student.subscriptions[index] = normalizeSubscriptionSnapshot(updatedSnapshot, studentId);

            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
        },

        renewSubscription(studentId, subscriptionId, options = {}) {
            const student = getStudentForMutation(studentId);
            const index = findSubscriptionIndex(student.subscriptions, subscriptionId);

            if (index < 0) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const current = normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
            const hasCustomDays = Number.isFinite(options.days);
            const days = hasCustomDays ? options.days : 180;
            const baseDeadlineDate = parseDateInput(current.deadline) || new Date();
            const nextDeadlineDate = addDays(baseDeadlineDate, days) || addDays(new Date(), days);
            const newDeadline = formatDateOutput(nextDeadlineDate);
            const nowIso = new Date().toISOString();
            const actor = typeof options.actor === 'string' ? options.actor : '';

            const metadata = {
                ...toClonedObject(current.metadata),
                lastRenewedAt: nowIso,
                lastRenewedBy: actor,
                renewCount: typeof current.metadata?.renewCount === 'number'
                    ? current.metadata.renewCount + 1
                    : 1,
                lastRenewDays: days,
                deadlineSource: hasCustomDays ? 'renew-custom' : 'renew-auto-180'
            };

            const historyEntry = normalizeHistoryEntry({
                action: 'renewed',
                timestamp: nowIso,
                actor,
                details: {
                    previousDeadline: current.deadline || '',
                    newDeadline,
                    daysExtended: days,
                    deadlineSource: metadata.deadlineSource
                }
            });

            const updatedSnapshot = {
                ...current,
                deadline: newDeadline,
                status: current.status === 'expired' ? 'waiting' : current.status,
                lastRenewedAt: nowIso,
                lastRenewedBy: actor,
                history: historyEntry ? current.history.concat(historyEntry) : current.history.slice(),
                metadata
            };

            student.subscriptions[index] = normalizeSubscriptionSnapshot(updatedSnapshot, studentId);

            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
        },

        cancelSubscription(studentId, subscriptionId, options = {}) {
            const student = getStudentForMutation(studentId);
            const index = findSubscriptionIndex(student.subscriptions, subscriptionId);

            if (index < 0) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const current = normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
            if (current.status === 'cancelled') {
                return current;
            }

            const nowIso = new Date().toISOString();
            const actor = typeof options.actor === 'string' ? options.actor : '';
            const reason = typeof options.reason === 'string' ? options.reason.trim() : '';

            const metadata = {
                ...toClonedObject(current.metadata),
                cancelledAt: nowIso,
                cancelledBy: actor,
                cancelledReason: reason
            };

            const historyEntry = normalizeHistoryEntry({
                action: 'cancelled',
                timestamp: nowIso,
                actor,
                details: {
                    previousStatus: current.status,
                    reason
                }
            });

            const updatedSnapshot = {
                ...current,
                status: 'cancelled',
                warning: '',
                history: historyEntry ? current.history.concat(historyEntry) : current.history.slice(),
                metadata
            };

            student.subscriptions[index] = normalizeSubscriptionSnapshot(updatedSnapshot, studentId);

            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
        },

        resolveSubscriptionContext(studentId, subscriptionId) {
            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            if (!student || !Array.isArray(student.subscriptions)) {
                return null;
            }

            const rawSubscription = student.subscriptions.find(item => String(item?.id) === String(subscriptionId));
            if (!rawSubscription) {
                return null;
            }

            const normalizedSubscription = normalizeSubscriptionSnapshot(rawSubscription, studentId);

            return {
                student: {
                    id: student.id,
                    name: student.name,
                    school: student.school,
                    status: cloneEntity(student.status)
                },
                subscription: normalizedSubscription,
                course: cloneEntity(normalizedSubscription.course),
                formSnapshot: normalizedSubscription.formSnapshot,
                submissionMode: normalizedSubscription.submissionMode,
                history: normalizedSubscription.history,
                metadata: cloneEntity(normalizedSubscription.metadata),
                createdAt: normalizedSubscription.createdAt || '',
                deadline: normalizedSubscription.deadline || '',
                status: normalizedSubscription.status,
                type: normalizedSubscription.type,
                lastRenewedAt: normalizedSubscription.lastRenewedAt || '',
                lastRenewedBy: normalizedSubscription.lastRenewedBy || ''
            };
        },

        addSubscription(studentId, payload) {
            validateSubscriptionPayload(payload);
            const student = getStudentForMutation(studentId);
            const initialMetadata = toClonedObject(payload.metadata);

            const creationDate = parseDateInput(payload.createdAt)
                || parseDateInput(payload.createdAtIso)
                || new Date();
            const resolvedCreatedAtIso = typeof payload.createdAtIso === 'string' && payload.createdAtIso
                ? payload.createdAtIso
                : creationDate.toISOString();
            const resolvedCreatedAt = typeof payload.createdAt === 'string' && payload.createdAt
                ? payload.createdAt
                : formatDateOutput(creationDate) || resolvedCreatedAtIso.split('T')[0];

            const providedDeadline = typeof payload.deadline === 'string' && payload.deadline.trim();
            const parsedProvidedDeadline = providedDeadline ? parseDateInput(payload.deadline.trim()) : null;
            const baseDeadlineDate = parsedProvidedDeadline || creationDate;
            const resolvedDeadline = providedDeadline
                ? (parsedProvidedDeadline ? formatDateOutput(parsedProvidedDeadline) : payload.deadline.trim())
                : formatDateOutput(addDays(baseDeadlineDate, 180)) || formatDateOutput(addDays(new Date(), 180));

            if (!providedDeadline) {
                initialMetadata.deadlineSource = 'auto-180';
            } else if (typeof initialMetadata.deadlineSource !== 'string' || !initialMetadata.deadlineSource) {
                initialMetadata.deadlineSource = 'manual';
            }

            const normalized = normalizeSubscriptionSnapshot({
                ...payload,
                createdAt: resolvedCreatedAt,
                createdAtIso: resolvedCreatedAtIso,
                deadline: resolvedDeadline,
                metadata: initialMetadata
            }, studentId);

            const duplicate = student.subscriptions.some(existing => {
                if (!existing) {
                    return false;
                }
                if (existing.id && normalized.id && String(existing.id) === normalized.id) {
                    return true;
                }
                return existing.course?.code === normalized.course.code && existing.type === normalized.type;
            });

            if (duplicate) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.duplicateEntry,
                    '订阅已存在',
                    { studentId, subscriptionId: normalized.id }
                );
            }

            student.subscriptions.push(normalized);

            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(normalized, studentId);
        },

        updateSubscription(studentId, subscriptionId, updates) {
            if (!updates || typeof updates !== 'object') {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    '订阅更新数据必须是对象'
                );
            }

            const student = getStudentForMutation(studentId);
            const index = findSubscriptionIndex(student.subscriptions, subscriptionId);

            if (index < 0) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const target = student.subscriptions[index] || {};
            const updated = {
                ...target,
                ...updates,
                id: target.id
            };

            validateSubscriptionPayload(updated);

            student.subscriptions[index] = normalizeSubscriptionSnapshot(updated, studentId);

            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(student.subscriptions[index], studentId);
        },

        removeSubscription(studentId, subscriptionId) {
            const student = getStudentForMutation(studentId);
            const index = findSubscriptionIndex(student.subscriptions, subscriptionId);

            if (index < 0) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const removed = student.subscriptions.splice(index, 1)[0];
            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(removed, studentId);
        },

        applyBatchSubscriptions(studentId, payload = []) {
            if (!Array.isArray(payload)) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    '批量订阅数据必须是数组'
                );
            }

            const student = getStudentForMutation(studentId);
            const inserted = [];
            const skipped = [];

            payload.forEach(entry => {
                try {
                    validateSubscriptionPayload(entry);
                    const normalized = normalizeSubscriptionSnapshot(entry, studentId);
                    const duplicateIndex = findSubscriptionIndex(student.subscriptions, normalized.id);

                    const matchByCourse = student.subscriptions.findIndex(existing => {
                        if (!existing) {
                            return false;
                        }
                        return existing.course?.code === normalized.course.code && existing.type === normalized.type;
                    });

                    if (duplicateIndex >= 0 || matchByCourse >= 0) {
                        skipped.push({ entry: normalized, reason: 'duplicate' });
                        return;
                    }

                    student.subscriptions.push(normalized);
                    inserted.push(normalized);
                } catch (error) {
                    if (error instanceof SubscriptionRepositoryError) {
                        skipped.push({ entry, reason: error.code });
                        return;
                    }
                    skipped.push({ entry, reason: 'unknown', error: String(error?.message || error) });
                }
            });

            if (inserted.length) {
                eventBus.emit('subscriptions:changed', { studentId: student.id });
            }

            return {
                inserted: inserted.map(item => normalizeSubscriptionSnapshot(item, studentId)),
                skipped
            };
        },

        subscribe(eventName, handler) {
            return eventBus.on(eventName, handler);
        },

        unsubscribe(eventName, handler) {
            eventBus.off(eventName, handler);
        },

        _emit(eventName, payload) {
            eventBus.emit(eventName, payload);
        },

        getSubscriptionBlueprint() {
            return subscriptionBlueprint;
        },

        getSubscriptionErrorTypes() {
            return subscriptionErrorTypes;
        },

        SubscriptionRepositoryError
    };

    global.StudentRepository = Object.freeze(repository);
})(window);
