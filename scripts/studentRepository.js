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

    const subscriptionCache = new Map();
    const MATCHED_COURSE_CACHE_KEY = 'matchedCourses';
    const MATCHED_COURSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    const selectedCoursesCache = new Map();
    const SELECTED_COURSES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

    const readSubscriptionCache = (subscriptionId, cacheKey) => {
        if (!subscriptionId) {
            return null;
        }
        const baseId = String(subscriptionId);
        if (!subscriptionCache.has(baseId)) {
            return null;
        }
        const entry = subscriptionCache.get(baseId);
        if (!entry || typeof entry !== 'object') {
            subscriptionCache.delete(baseId);
            return null;
        }

        const cachedSegment = entry[cacheKey];
        if (!cachedSegment || typeof cachedSegment !== 'object') {
            return null;
        }

        const { value, cachedAt } = cachedSegment;
        if (!cachedAt || Date.now() - cachedAt > MATCHED_COURSE_CACHE_TTL) {
            if (entry[cacheKey]) {
                delete entry[cacheKey];
            }
            if (!Object.keys(entry).length) {
                subscriptionCache.delete(baseId);
            }
            return null;
        }

        return cloneEntity(value);
    };

    const writeSubscriptionCache = (subscriptionId, cacheKey, value) => {
        if (!subscriptionId) {
            return;
        }
        const baseId = String(subscriptionId);
        const entry = subscriptionCache.get(baseId) || {};
        entry[cacheKey] = {
            value: cloneEntity(value),
            cachedAt: Date.now()
        };
        subscriptionCache.set(baseId, entry);
    };

    const invalidateSubscriptionCacheSegment = (subscriptionId, cacheKey) => {
        if (!subscriptionId) {
            return;
        }
        const baseId = String(subscriptionId);
        if (!subscriptionCache.has(baseId)) {
            return;
        }
        const entry = subscriptionCache.get(baseId);
        if (!entry || typeof entry !== 'object') {
            subscriptionCache.delete(baseId);
            return;
        }

        if (entry[cacheKey]) {
            delete entry[cacheKey];
        }

        if (!Object.keys(entry).length) {
            subscriptionCache.delete(baseId);
        }
    };

    const readSelectedCoursesCache = (studentId) => {
        if (!studentId) {
            return null;
        }
        const baseId = String(studentId);
        if (!selectedCoursesCache.has(baseId)) {
            return null;
        }
        const entry = selectedCoursesCache.get(baseId);
        if (!entry || typeof entry !== 'object') {
            selectedCoursesCache.delete(baseId);
            return null;
        }
        const { value, cachedAt } = entry;
        if (!cachedAt || Date.now() - cachedAt > SELECTED_COURSES_CACHE_TTL) {
            selectedCoursesCache.delete(baseId);
            return null;
        }
        return cloneEntity(value);
    };

    const writeSelectedCoursesCache = (studentId, value) => {
        if (!studentId) {
            return;
        }
        const baseId = String(studentId);
        selectedCoursesCache.set(baseId, {
            value: cloneEntity(value),
            cachedAt: Date.now()
        });
    };

    const invalidateSelectedCoursesCache = (studentId) => {
        if (!studentId) {
            return;
        }
        const baseId = String(studentId);
        selectedCoursesCache.delete(baseId);
    };

    let subscriptionIdSeed = Date.now();
    let selectedCourseIdSeed = Date.now();

    const ensureSubscriptionId = (subscription, studentId) => {
        if (subscription && typeof subscription.id === 'string' && subscription.id.trim()) {
            return subscription.id.trim();
        }
        subscriptionIdSeed += 1;
        const baseStudentId = typeof studentId === 'undefined' ? 'unknown' : String(studentId).trim() || 'unknown';
        return `sub-${baseStudentId}-${subscriptionIdSeed}`;
    };

    const ensureSelectedCourseId = (studentId) => {
        selectedCourseIdSeed += 1;
        const baseStudentId = typeof studentId === 'undefined' ? 'unknown' : String(studentId).trim() || 'unknown';
        return `sel-${baseStudentId}-${selectedCourseIdSeed}`;
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

    const ensureStudentDetailsContainer = (student) => {
        if (!student || typeof student !== 'object') {
            return {
                selectedCourses: [],
                autonomousPlan: []
            };
        }
        if (!student.details || typeof student.details !== 'object') {
            student.details = {};
        }
        if (!Array.isArray(student.details.selectedCourses)) {
            student.details.selectedCourses = [];
        }
        if (!Array.isArray(student.details.autonomousPlan)) {
            student.details.autonomousPlan = [];
        }
        return student.details;
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

        if (Array.isArray(snapshot.matchResults)) {
            snapshot.matchResults = snapshot.matchResults.map(entry => cloneEntity(entry)).filter(Boolean);
        } else {
            snapshot.matchResults = [];
        }

        if (typeof snapshot.metadata.matchSource !== 'string' || !snapshot.metadata.matchSource) {
            snapshot.metadata.matchSource = snapshot.matchResults.length ? 'snapshot' : 'unknown';
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
            if (!cells.length) {
                return;
            }

            const textValues = cells.map(textFromCell);
            const entry = {
                coursePrice: textValues[0] || '',
                schoolName: textValues[1] || '',
                courseCode: textValues[2] || '',
                courseName: textValues[3] || '',
                startDate: textValues[6] || '',
                endDate: textValues[7] || '',
                seatsRemaining: parseSeats(textValues[8]),
                courseDuration: textValues[9] || '',
                courseModality: textValues[10] || '',
                academicTerm: textValues[11] || ''
            };

            entry.isOnSale = true;
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

    const normalizeCreditValue = (credit) => {
        const numeric = Number(credit);
        return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizeAvailability = (value) => {
        if (typeof value !== 'string') {
            return 'unknown';
        }
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return 'unknown';
        }
        if (['available', 'open', 'on', 'yes'].includes(normalized)) {
            return 'available';
        }
        if (['full', 'closed', 'no', 'off'].includes(normalized)) {
            return 'full';
        }
        return normalized;
    };

    const dedupeByKey = (list, createKey) => {
        const deduped = [];
        const seen = new Set();
        list.forEach(item => {
            const key = createKey(item);
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(item);
            }
        });
        return deduped;
    };

    const buildHomeCourseMatches = ({
        student,
        subscription,
        baseMatches
    }) => {
        const subscriptionCourse = subscription.course || {};
        const courseCode = subscriptionCourse.code || '';
        const courseName = subscriptionCourse.name || '';
        const matches = [];

        const normalizedBase = Array.isArray(baseMatches)
            ? baseMatches.map(entry => {
                const courseEntry = entry && typeof entry === 'object' ? entry : {};
                return {
                    courseCode: courseEntry.courseCode || courseCode,
                    courseName: courseEntry.courseName || courseName,
                    category: courseEntry.category || courseEntry.generalCategory || '',
                    credit: normalizeCreditValue(courseEntry.credit),
                    availability: normalizeAvailability(courseEntry.availability || courseEntry.status),
                    source: courseEntry.source || 'snapshot',
                    term: courseEntry.term || '',
                    year: courseEntry.year || ''
                };
            })
            : [];
        matches.push(...normalizedBase);

        const details = getStudentDetails(student);
        const plan = Array.isArray(details.autonomousPlan) ? details.autonomousPlan : [];
        plan.filter(planCourse => {
            if (!planCourse || typeof planCourse !== 'object') {
                return false;
            }
            if (!courseCode) {
                return true;
            }
            return String(planCourse.code || '').trim() === String(courseCode).trim();
        }).forEach(planCourse => {
            matches.push({
                courseCode: planCourse.code || courseCode,
                courseName: planCourse.name || courseName,
                category: planCourse.category || '',
                credit: normalizeCreditValue(planCourse.credit),
                availability: normalizeAvailability(planCourse.status),
                source: 'autonomous-plan',
                term: planCourse.term || '',
                year: planCourse.year || ''
            });
        });

        if (!matches.length && (courseCode || courseName)) {
            matches.push({
                courseCode,
                courseName,
                category: subscription.metadata?.category || '',
                credit: normalizeCreditValue(subscription.metadata?.credit),
                availability: normalizeAvailability(subscription.status),
                source: 'subscription-course',
                term: subscription.term || '',
                year: ''
            });
        }

        return dedupeByKey(matches, item => `${item.courseCode}::${item.source}`);
    };

    const buildProductCourseMatches = ({
        student,
        subscription,
        baseMatches,
        sharedCaches
    }) => {
        const subscriptionCourse = subscription.course || {};
        const courseCode = subscriptionCourse.code || '';
        const schoolName = student.school || subscriptionCourse.school || '';

        const unitMap = sharedCaches && sharedCaches.unitMap instanceof Map
            ? sharedCaches.unitMap
            : collectProductUnits();

        const mappingRecords = Array.isArray(sharedCaches?.mappingRecords)
            ? sharedCaches.mappingRecords
            : collectCourseMappings();

        const relevantMappings = mappingRecords.filter(record => {
            if (!record || typeof record !== 'object') {
                return false;
            }
            const recordSchool = record.schoolName || record.sourceSchool || '';
            const recordCourseCode = record.courseCode || '';
            if (schoolName && recordSchool && recordSchool !== schoolName) {
                return false;
            }
            if (courseCode && recordCourseCode && recordCourseCode !== courseCode) {
                return false;
            }
            return true;
        });

        const baseProductMatches = Array.isArray(baseMatches)
            ? baseMatches.map(entry => {
                const productEntry = entry && typeof entry === 'object' ? entry : {};
                const unitKey = makeUnitKey(productEntry.schoolName || productEntry.productSchool, productEntry.productCourseCode || productEntry.courseCode);
                const unit = unitMap.get(unitKey);
                const isOnSale = typeof productEntry.isOnSale === 'boolean'
                    ? productEntry.isOnSale
                    : Boolean(unit?.isOnSale);
                return {
                    productId: productEntry.productId || unitKey || `${productEntry.productSchool || ''}-${productEntry.productCourseCode || ''}`,
                    productCourseCode: productEntry.productCourseCode || productEntry.courseCode || '',
                    productCourseName: productEntry.productCourseName || productEntry.courseName || unit?.courseName || '',
                    schoolName: productEntry.schoolName || productEntry.productSchool || unit?.schoolName || '',
                    onsaleStatus: isOnSale ? 'onSale' : 'soldOut',
                    price: productEntry.price || unit?.coursePrice || '',
                    nextStartDate: productEntry.nextStartDate || unit?.startDate || '',
                    modality: productEntry.modality || unit?.courseModality || '',
                    duration: productEntry.duration || unit?.courseDuration || '',
                    source: productEntry.source || 'snapshot',
                    alignmentStatus: productEntry.alignmentStatus || '',
                    verificationOutcome: productEntry.verificationOutcome || ''
                };
            })
            : [];

        const matches = [...baseProductMatches];
        const candidateProductCodes = new Set();
        const candidateUnitKeys = new Set();

        baseProductMatches.forEach(entry => {
            const code = (entry.productCourseCode || entry.courseCode || '').trim();
            const school = (entry.schoolName || entry.productSchool || '').trim();
            if (code) {
                candidateProductCodes.add(code.toLowerCase());
            }
            if (code || school) {
                candidateUnitKeys.add(makeUnitKey(school, code));
            }
        });

        relevantMappings.forEach(mapping => {
            const unitKey = makeUnitKey(mapping.productSchool, mapping.productCourseCode);
            const unit = unitMap.get(unitKey);
            if (!unit) {
                return;
            }
            const isOnSale = Boolean(unit.isOnSale);
            matches.push({
                productId: unitKey || `${mapping.productSchool || ''}-${mapping.productCourseCode || ''}`,
                productCourseCode: mapping.productCourseCode || '',
                productCourseName: unit?.courseName || mapping.productCourseName || '',
                schoolName: unit?.schoolName || mapping.productSchool || '',
                onsaleStatus: isOnSale ? 'onSale' : 'onSale',
                price: unit?.coursePrice || '',
                nextStartDate: unit?.startDate || '',
                modality: unit?.courseModality || '',
                duration: unit?.courseDuration || '',
                source: 'mapping-table',
                alignmentStatus: mapping.alignmentStatus || '',
                verificationOutcome: mapping.verificationOutcome || ''
            });

            const code = (mapping.productCourseCode || '').trim();
            const school = (mapping.productSchool || '').trim();
            if (code) {
                candidateProductCodes.add(code.toLowerCase());
            }
            if (code || school) {
                candidateUnitKeys.add(makeUnitKey(school, code));
            }
        });

        if (!matches.length && unitMap.size) {
            if (!candidateProductCodes.size && subscription.type === 'product') {
                const subscriptionCodeRaw = (subscription.course?.code || '').trim();
                const subscriptionSchool = (subscription.course?.school || '').trim();
                if (subscriptionCodeRaw) {
                    candidateProductCodes.add(subscriptionCodeRaw.toLowerCase());
                    candidateUnitKeys.add(makeUnitKey(subscriptionSchool, subscriptionCodeRaw));
                }
            }

            const seenFallbackKeys = new Set();

            if (candidateUnitKeys.size) {
                candidateUnitKeys.forEach(key => {
                    const unit = unitMap.get(key);
                    if (!unit) {
                        return;
                    }
                    if (seenFallbackKeys.has(key)) {
                        return;
                    }
                    seenFallbackKeys.add(key);
                    matches.push({
                        productId: key,
                        productCourseCode: unit.courseCode || '',
                        productCourseName: unit.courseName || '',
                        schoolName: unit.schoolName || '',
                        onsaleStatus: 'onSale',
                        price: unit.coursePrice || '',
                        nextStartDate: unit.startDate || '',
                        modality: unit.courseModality || '',
                        duration: unit.courseDuration || '',
                        source: 'unit-table',
                        alignmentStatus: '',
                        verificationOutcome: ''
                    });
                });
            }

            if (!matches.length && candidateProductCodes.size) {
                unitMap.forEach((unit, key) => {
                    const normalizedCode = (unit.courseCode || '').trim().toLowerCase();
                    if (!candidateProductCodes.has(normalizedCode)) {
                        return;
                    }
                    if (seenFallbackKeys.has(key)) {
                        return;
                    }
                    seenFallbackKeys.add(key);
                    matches.push({
                        productId: key,
                        productCourseCode: unit.courseCode || '',
                        productCourseName: unit.courseName || '',
                        schoolName: unit.schoolName || '',
                        onsaleStatus: 'onSale',
                        price: unit.coursePrice || '',
                        nextStartDate: unit.startDate || '',
                        modality: unit.courseModality || '',
                        duration: unit.courseDuration || '',
                        source: 'unit-table',
                        alignmentStatus: '',
                        verificationOutcome: ''
                    });
                });
            }
        }

        return dedupeByKey(matches, item => `${item.schoolName}::${item.productCourseCode}`);
    };

    const resolveMatchedCoursesInternal = (student, subscription, options = {}) => {
        const includeProduct = options.includeProduct !== false;
        const includeHome = options.includeHome !== false;

        const baseMatches = Array.isArray(subscription.matchResults)
            ? subscription.matchResults.filter(entry => entry && typeof entry === 'object')
            : [];
        const baseHomeMatches = baseMatches.filter(entry => (entry.source || '').startsWith('home'));
        const baseProductMatches = baseMatches.filter(entry => (entry.source || '').startsWith('product'));

        const sharedCaches = options.sharedCaches && typeof options.sharedCaches === 'object'
            ? options.sharedCaches
            : {};

        if (!sharedCaches.unitMap) {
            sharedCaches.unitMap = collectProductUnits();
        }

        if (!sharedCaches.mappingRecords) {
            sharedCaches.mappingRecords = collectCourseMappings();
        }

        const homeCourses = includeHome
            ? buildHomeCourseMatches({ student, subscription, baseMatches: baseHomeMatches })
            : [];
        const productCourses = includeProduct
            ? buildProductCourseMatches({ student, subscription, baseMatches: baseProductMatches, sharedCaches })
            : [];

        const hasOnSaleProduct = productCourses.some(course => course.onsaleStatus === 'onSale');

        const summary = {
            homeCount: homeCourses.length,
            productCount: productCourses.length,
            hasOnSaleProduct,
            generatedAt: new Date().toISOString()
        };

        const metadata = {
            studentId: student.id,
            subscriptionId: subscription.id,
            courseCode: subscription.course?.code || '',
            schoolName: student.school || subscription.course?.school || '',
            deadlineSource: subscription.metadata?.deadlineSource || '',
            matchSource: subscription.metadata?.matchSource || (baseMatches.length ? 'snapshot' : 'runtime')
        };

        return {
            homeCourses,
            productCourses,
            summary,
            metadata
        };
    };

    const ensureSubscriptionMatchedStatus = (student, subscriptionIndex, normalizedSubscription, dataset) => {
        if (!student || subscriptionIndex < 0 || !normalizedSubscription) {
            return {
                snapshot: normalizedSubscription,
                changed: false
            };
        }

        const hasOnSaleProduct = Boolean(
            dataset?.summary?.hasOnSaleProduct
            || (Array.isArray(dataset?.productCourses) && dataset.productCourses.some(course => course && course.onsaleStatus === 'onSale'))
        );

        if (!hasOnSaleProduct || normalizedSubscription.status === 'matched') {
            return {
                snapshot: normalizedSubscription,
                changed: false
            };
        }

        const nowIso = new Date().toISOString();
        const historyEntry = normalizeHistoryEntry({
            action: 'status-updated',
            timestamp: nowIso,
            actor: '系统',
            details: {
                from: normalizedSubscription.status,
                to: 'matched',
                reason: 'matched-course-onsale'
            }
        });

        const updatedSnapshot = {
            ...normalizedSubscription,
            status: 'matched',
            history: historyEntry
                ? normalizedSubscription.history.concat(historyEntry)
                : normalizedSubscription.history.slice(),
            metadata: {
                ...toClonedObject(normalizedSubscription.metadata),
                lastMatchedAt: nowIso
            }
        };

        const normalizedUpdatedSnapshot = normalizeSubscriptionSnapshot(updatedSnapshot, student.id);
        student.subscriptions[subscriptionIndex] = normalizedUpdatedSnapshot;

        return {
            snapshot: normalizedUpdatedSnapshot,
            changed: true
        };
    };

    const buildSelectedCourseEntry = (payload, context = {}) => {
        const { studentId } = context;
        const source = typeof payload.source === 'string' ? payload.source.trim() : '';
        const nowIso = new Date().toISOString();
        const baseEntry = {
            id: ensureSelectedCourseId(studentId),
            source,
            addedAt: nowIso,
            metadata: {
                mappingId: payload.mappingId || '',
                addedBy: payload.actor || '',
                note: payload.note || ''
            }
        };

        if (source === 'home') {
            return {
                ...baseEntry,
                courseCode: payload.courseCode || '',
                courseName: payload.courseName || payload.courseDisplayName || '',
                category: payload.category || '',
                credit: normalizeCreditValue(payload.credit),
                availability: normalizeAvailability(payload.availability || 'available'),
                status: payload.status || 'tracking',
                term: payload.term || '',
                year: payload.year || '',
                productCourses: Array.isArray(payload.productCourses)
                    ? payload.productCourses.map(product => cloneEntity(product))
                    : []
            };
        }

        const productCourse = {
            code: payload.productCourseCode || payload.courseCode || '',
            name: payload.productCourseName || payload.courseName || '',
            school: payload.schoolName || payload.productSchool || '',
            isOnSale: payload.isOnSale === true || payload.onsaleStatus === 'onSale',
            price: payload.price || '',
            startDate: payload.nextStartDate || payload.startDate || '',
            endDate: payload.endDate || '',
            duration: payload.duration || '',
            modality: payload.modality || '',
            credit: normalizeCreditValue(payload.credit),
            mappingId: payload.mappingId || ''
        };

        return {
            ...baseEntry,
            productCourseCode: productCourse.code,
            productCourseName: productCourse.name,
            schoolName: productCourse.school,
            onsaleStatus: productCourse.isOnSale ? 'onSale' : 'soldOut',
            price: productCourse.price,
            nextStartDate: productCourse.startDate,
            duration: productCourse.duration,
            modality: productCourse.modality,
            courseCode: payload.homeCourseCode || payload.courseCode || '',
            courseName: payload.homeCourseName || '',
            credit: productCourse.credit,
            productCourses: [productCourse]
        };
    };

    const isDuplicateSelectedCourse = (existingList, candidate) => {
        if (!Array.isArray(existingList) || !candidate) {
            return false;
        }

        const normalizeCode = (value) => (value ? String(value).trim() : '');
        const candidateHomeCode = normalizeCode(candidate.courseCode);
        const candidateProductCode = normalizeCode(candidate.productCourseCode);

        return existingList.some(entry => {
            if (!entry || typeof entry !== 'object') {
                return false;
            }
            const entryHomeCodes = [
                normalizeCode(entry.courseCode),
                normalizeCode(entry.homeCourse),
                normalizeCode(entry.homeCourseCode)
            ].filter(Boolean);

            if (candidate.source === 'home' && candidateHomeCode) {
                if (entryHomeCodes.includes(candidateHomeCode)) {
                    return true;
                }
            }

            const entryProductCodes = [];
            if (entry.productCourseCode) {
                entryProductCodes.push(normalizeCode(entry.productCourseCode));
            }
            if (Array.isArray(entry.productCourses)) {
                entry.productCourses.forEach(product => {
                    if (product && typeof product === 'object') {
                        entryProductCodes.push(normalizeCode(product.code || product.productCourseCode));
                    }
                });
            }

            if (candidate.source === 'product' && candidateProductCode) {
                if (entryProductCodes.includes(candidateProductCode)) {
                    return true;
                }
            }

            return false;
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

        getSelectedCourses(studentId, options = {}) {
            const resolvedOptions = typeof options === 'boolean'
                ? { forceRefresh: options }
                : (options || {});
            const forceRefresh = resolvedOptions.forceRefresh === true;

            if (!forceRefresh) {
                const cached = readSelectedCoursesCache(studentId);
                if (cached) {
                    return cached;
                }
            }

            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            if (!student) {
                return [];
            }

            const runtimeSelected = buildSelectedCoursesFromRuntime(student);
            if (runtimeSelected.length) {
                writeSelectedCoursesCache(studentId, runtimeSelected);
                return runtimeSelected.map(cloneEntity);
            }

            const details = getStudentDetails(student);
            const selected = Array.isArray(details.selectedCourses)
                ? details.selectedCourses
                : [];
            writeSelectedCoursesCache(studentId, selected);
            return selected.map(cloneEntity);
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
            const normalizedList = [];
            const sharedCaches = {
                unitMap: null,
                mappingRecords: null
            };

            for (let index = 0; index < student.subscriptions.length; index += 1) {
                const subscription = student.subscriptions[index];
                let normalized = normalizeSubscriptionSnapshot(subscription, studentId);

                if (normalized.status === 'waiting') {
                    let dataset = readSubscriptionCache(normalized.id, MATCHED_COURSE_CACHE_KEY);

                    if (!dataset) {
                        if (!sharedCaches.unitMap || !sharedCaches.mappingRecords) {
                            sharedCaches.unitMap = collectProductUnits();
                            sharedCaches.mappingRecords = collectCourseMappings();
                        }

                        dataset = resolveMatchedCoursesInternal(student, normalized, {
                            includeHome: true,
                            includeProduct: true,
                            sharedCaches
                        });
                        writeSubscriptionCache(normalized.id, MATCHED_COURSE_CACHE_KEY, dataset);
                    }

                    const { snapshot, changed } = ensureSubscriptionMatchedStatus(student, index, normalized, dataset);
                    normalized = snapshot;

                    if (changed) {
                        writeSubscriptionCache(normalized.id, MATCHED_COURSE_CACHE_KEY, dataset);
                    }
                }

                normalizedList.push(normalized);
            }

            return normalizedList;
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

            invalidateSubscriptionCacheSegment(subscriptionId, MATCHED_COURSE_CACHE_KEY);
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
                warning: '',
                history: historyEntry ? current.history.concat(historyEntry) : current.history.slice(),
                metadata
            };

            student.subscriptions[index] = normalizeSubscriptionSnapshot(updatedSnapshot, studentId);

            invalidateSubscriptionCacheSegment(subscriptionId, MATCHED_COURSE_CACHE_KEY);
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

            invalidateSubscriptionCacheSegment(subscriptionId, MATCHED_COURSE_CACHE_KEY);
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

        resolveMatchedCourses(studentId, subscriptionId, options = {}) {
            const includeHome = options.includeHome !== false;
            const includeProduct = options.includeProduct !== false;
            const forceRefresh = options.forceRefresh === true;

            if (!forceRefresh) {
                const cached = readSubscriptionCache(subscriptionId, MATCHED_COURSE_CACHE_KEY);
                if (cached) {
                    const cloned = cloneEntity(cached);
                    if (!includeHome) {
                        cloned.homeCourses = [];
                    }
                    if (!includeProduct) {
                        cloned.productCourses = [];
                    }
                    cloned.summary = {
                        ...cloned.summary,
                        homeCount: cloned.homeCourses.length,
                        productCount: cloned.productCourses.length,
                        hasOnSaleProduct: cloned.productCourses.some(course => course.onsaleStatus === 'onSale')
                    };
                    return cloned;
                }
            }

            const student = getFollowUpCollection().find(item => String(item.id) === String(studentId));
            if (!student || !Array.isArray(student.subscriptions)) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到学生 ${studentId}`,
                    { studentId }
                );
            }

            const rawSubscription = student.subscriptions.find(item => String(item?.id) === String(subscriptionId));
            if (!rawSubscription) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.notFound,
                    `未找到订阅 ${subscriptionId}`,
                    { studentId, subscriptionId }
                );
            }

            const subscriptionIndex = student.subscriptions.indexOf(rawSubscription);
            let normalizedSubscription = normalizeSubscriptionSnapshot(rawSubscription, studentId);
            const dataset = resolveMatchedCoursesInternal(student, normalizedSubscription, { includeHome: true, includeProduct: true });

            const { snapshot: ensuredSubscription, changed } = ensureSubscriptionMatchedStatus(
                student,
                subscriptionIndex,
                normalizedSubscription,
                dataset
            );

            normalizedSubscription = ensuredSubscription;

            if (changed) {
                eventBus.emit('subscriptions:changed', { studentId: student.id });
            }

            writeSubscriptionCache(subscriptionId, MATCHED_COURSE_CACHE_KEY, dataset);

            const clonedDataset = cloneEntity(dataset);
            if (!includeHome) {
                clonedDataset.homeCourses = [];
            }
            if (!includeProduct) {
                clonedDataset.productCourses = [];
            }
            clonedDataset.summary = {
                ...clonedDataset.summary,
                homeCount: clonedDataset.homeCourses.length,
                productCount: clonedDataset.productCourses.length,
                hasOnSaleProduct: clonedDataset.productCourses.some(course => course.onsaleStatus === 'onSale')
            };
            return clonedDataset;
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

            invalidateSubscriptionCacheSegment(normalized.id, MATCHED_COURSE_CACHE_KEY);
            eventBus.emit('subscriptions:changed', { studentId: student.id });
            return normalizeSubscriptionSnapshot(normalized, studentId);
        },

        addCourseToSelected(studentId, payload = {}) {
            if (!payload || typeof payload !== 'object') {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    '选课数据必须是对象'
                );
            }

            const source = typeof payload.source === 'string' ? payload.source.trim() : '';
            if (!['home', 'product'].includes(source)) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    `未知的选课来源: ${source}`,
                    { source }
                );
            }

            if (source === 'home' && !payload.courseCode) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    '本校课程必须提供 courseCode',
                    { source }
                );
            }

            if (source === 'product' && !payload.productCourseCode && !payload.courseCode) {
                throw new SubscriptionRepositoryError(
                    subscriptionErrorTypes.invalidPayload,
                    '产品课程必须提供 productCourseCode 或 courseCode',
                    { source }
                );
            }

            const student = getStudentForMutation(studentId);
            const details = ensureStudentDetailsContainer(student);
            const candidate = buildSelectedCourseEntry({ ...payload, source }, { studentId: student.id });

            const duplicate = isDuplicateSelectedCourse(details.selectedCourses, candidate);
            if (duplicate) {
                return {
                    success: false,
                    reason: 'duplicate',
                    selectedCourses: this.getSelectedCourses(studentId, { forceRefresh: true })
                };
            }

            details.selectedCourses.push(candidate);
            invalidateSelectedCoursesCache(studentId);

            const updatedSelected = this.getSelectedCourses(studentId, { forceRefresh: true });
            eventBus.emit('selectedCourses:changed', {
                studentId: student.id,
                entry: cloneEntity(candidate)
            });

            return {
                success: true,
                entry: cloneEntity(candidate),
                selectedCourses: updatedSelected
            };
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

            invalidateSubscriptionCacheSegment(subscriptionId, MATCHED_COURSE_CACHE_KEY);
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
            invalidateSubscriptionCacheSegment(subscriptionId, MATCHED_COURSE_CACHE_KEY);
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
                inserted.forEach(entry => invalidateSubscriptionCacheSegment(entry.id, MATCHED_COURSE_CACHE_KEY));
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
