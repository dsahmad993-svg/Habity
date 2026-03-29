const STORAGE_KEY = "tracker_black_green_v4";

        const state = {
            month: currentMonth(),
            habits: [],
            logs: {},
            journals: {},
            palette: "signature",
            lastDeleted: null,
            undoTimer: null,
            historyHabitId: null,
            editingId: null
        };

        const paletteOrder = ["signature", "ocean", "forest"];
        const paletteLabel = {
            signature: "Signature",
            ocean: "Ocean",
            forest: "Forest"
        };

        const el = {
            monthTitle: document.getElementById("monthTitle"),
            monthPicker: document.getElementById("monthPicker"),
            quickDate: document.getElementById("quickDate"),
            themeCycleBtn: document.getElementById("themeCycleBtn"),
            todayBtn: document.getElementById("todayBtn"),
            habitName: document.getElementById("habitName"),
            modeToggle: document.getElementById("modeToggle"),
            habitTarget: document.getElementById("habitTarget"),
            habitUnit: document.getElementById("habitUnit"),
            creator: document.getElementById("creator"),
            addHabitBtn: document.getElementById("addHabitBtn"),
            trackerTable: document.getElementById("trackerTable"),
            weekCircles: document.getElementById("weekCircles"),
            trendCanvas: document.getElementById("trendCanvas"),
            analysisList: document.getElementById("analysisList"),
            habitCount: document.getElementById("habitCount"),
            completedCount: document.getElementById("completedCount"),
            progressValue: document.getElementById("progressValue"),
            progressFill: document.getElementById("progressFill"),
            journalDate: document.getElementById("journalDate"),
            journalText: document.getElementById("journalText"),
            saveJournalBtn: document.getElementById("saveJournalBtn"),
            exportPassword: document.getElementById("exportPassword"),
            importPassword: document.getElementById("importPassword"),
            exportCode: document.getElementById("exportCode"),
            importCode: document.getElementById("importCode"),
            genCodeBtn: document.getElementById("genCodeBtn"),
            applyCodeBtn: document.getElementById("applyCodeBtn"),
            downloadBtn: document.getElementById("downloadBtn"),
            importBtn: document.getElementById("importBtn"),
            importInput: document.getElementById("importInput"),
            editModal: document.getElementById("editModal"),
            editName: document.getElementById("editName"),
            editModeToggle: document.getElementById("editModeToggle"),
            editTarget: document.getElementById("editTarget"),
            editUnit: document.getElementById("editUnit"),
            cancelEdit: document.getElementById("cancelEdit"),
            saveEdit: document.getElementById("saveEdit"),
            historyModal: document.getElementById("historyModal"),
            historyMeta: document.getElementById("historyMeta"),
            historyCanvas: document.getElementById("historyCanvas"),
            closeHistory: document.getElementById("closeHistory"),
            undoToast: document.getElementById("undoToast"),
            undoText: document.getElementById("undoText"),
            undoBtn: document.getElementById("undoBtn")
        };

        let journalAutosaveTimer = null;

        init();

        function init() {
            load();
            if (state.habits.length === 0) {
                state.habits = [
                    { id: makeId(), name: "Wake up at 06:00", mode: "binary", target: 1, unit: "" },
                    { id: makeId(), name: "Gym", mode: "binary", target: 1, unit: "" },
                    { id: makeId(), name: "Drink water", mode: "quantity", target: 10, unit: "glasses" }
                ];
            }

            el.monthPicker.value = state.month;
            el.quickDate.value = todayDate();
            if (!paletteOrder.includes(state.palette)) {
                state.palette = "signature";
            }
            applyPalette(state.palette);
            el.journalDate.value = todayDate();
            updateCreateMode();
            updateEditMode();
            bindEvents();
            loadJournal(el.journalDate.value);
            render();
        }

        function bindEvents() {
            el.todayBtn.addEventListener("click", () => {
                const today = todayDate();
                state.month = today.slice(0, 7);
                el.monthPicker.value = state.month;
                el.quickDate.value = today;
                el.journalDate.value = today;
                loadJournal(today);
                save();
                render();
            });

            el.monthPicker.addEventListener("change", () => {
                state.month = el.monthPicker.value || currentMonth();
                save();
                render();
            });

            el.quickDate.addEventListener("change", () => {
                const chosen = el.quickDate.value;
                if (!chosen) return;
                state.month = chosen.slice(0, 7);
                el.monthPicker.value = state.month;
                el.journalDate.value = chosen;
                loadJournal(chosen);
                save();
                render();
            });

            el.themeCycleBtn.addEventListener("click", () => {
                const currentIndex = paletteOrder.indexOf(state.palette);
                const nextIndex = (currentIndex + 1) % paletteOrder.length;
                state.palette = paletteOrder[nextIndex];
                applyPalette(state.palette);
                save();
            });

            el.habitName.addEventListener("input", () => {
                el.creator.classList.toggle("expanded", el.habitName.value.trim().length > 0);
            });

            el.modeToggle.addEventListener("change", updateCreateMode);
            el.addHabitBtn.addEventListener("click", addHabit);
            el.habitName.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addHabit();
                }
            });

            el.journalDate.addEventListener("change", () => {
                if (!el.journalDate.value) el.journalDate.value = todayDate();
                loadJournal(el.journalDate.value);
            });

            el.journalText.addEventListener("input", () => {
                if (journalAutosaveTimer) {
                    window.clearTimeout(journalAutosaveTimer);
                }
                journalAutosaveTimer = window.setTimeout(() => {
                    const key = el.journalDate.value || todayDate();
                    state.journals[key] = el.journalText.value;
                    save();
                }, 450);
            });

            el.saveJournalBtn.addEventListener("click", () => {
                const key = el.journalDate.value || todayDate();
                state.journals[key] = el.journalText.value;
                save();
            });

            el.genCodeBtn.addEventListener("click", async () => {
                const password = el.exportPassword.value.trim();
                if (!password) {
                    el.exportCode.value = encodePayload(exportPayload());
                    return;
                }
                try {
                    el.exportCode.value = await encryptPayload(exportPayload(), password);
                } catch (_err) {
                    alert("Could not encrypt on this browser.");
                }
            });

            el.applyCodeBtn.addEventListener("click", async () => {
                const code = el.importCode.value.trim();
                if (!code) return;
                try {
                    let payload;
                    if (code.startsWith("enc:")) {
                        const password = el.importPassword.value.trim();
                        if (!password) {
                            alert("Password is required for encrypted code.");
                            return;
                        }
                        payload = await decryptPayload(code, password);
                    } else {
                        payload = decodePayload(code);
                    }
                    applyImportedPayload(payload);
                    save();
                    render();
                    loadJournal(el.journalDate.value || todayDate());
                    alert("Import code applied.");
                } catch (_e) {
                    alert("Invalid code.");
                }
            });

            el.downloadBtn.addEventListener("click", () => {
                const payload = JSON.stringify(exportPayload(), null, 2);
                const blob = new Blob([payload], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "habit-tracker-backup.json";
                a.click();
                URL.revokeObjectURL(url);
            });

            el.importBtn.addEventListener("click", () => el.importInput.click());
            el.importInput.addEventListener("change", importFile);

            el.editModeToggle.addEventListener("change", updateEditMode);
            el.cancelEdit.addEventListener("click", closeEditModal);
            el.saveEdit.addEventListener("click", applyEdit);
            el.closeHistory.addEventListener("click", () => el.historyModal.classList.remove("active"));
            el.undoBtn.addEventListener("click", undoDeleteHabit);
            el.editModal.addEventListener("click", (event) => {
                if (event.target === el.editModal) closeEditModal();
            });
            el.historyModal.addEventListener("click", (event) => {
                if (event.target === el.historyModal) el.historyModal.classList.remove("active");
            });
        }

        function updateCreateMode() {
            const on = el.modeToggle.checked;
            el.creator.classList.toggle("quantity-on", on);
        }

        function updateEditMode() {
            const on = el.editModeToggle.checked;
            el.editModal.classList.toggle("quantity-on", on);
        }

        function addHabit() {
            const name = el.habitName.value.trim();
            if (!name) return;

            const mode = el.modeToggle.checked ? "quantity" : "binary";
            const target = mode === "quantity" ? Math.max(parseInt(el.habitTarget.value || "0", 10), 1) : 1;
            const unit = mode === "quantity" ? (el.habitUnit.value.trim() || "units") : "";

            state.habits.push({
                id: makeId(),
                name,
                mode,
                target,
                unit
            });

            el.habitName.value = "";
            el.habitTarget.value = "";
            el.habitUnit.value = "";
            el.modeToggle.checked = false;
            el.creator.classList.remove("expanded", "quantity-on");
            save();
            render();
        }

        function render() {
            renderHeader();
            renderTable();
            renderWeekCircles();
            renderAnalysis();
            renderTrend();
        }

        function renderHeader() {
            const dates = monthDates(state.month);
            const slots = dates.length * state.habits.length;
            const done = dates.reduce((sum, d) => sum + countDone(d), 0);
            const pct = slots === 0 ? 0 : Math.round((done / slots) * 100);

            el.habitCount.textContent = String(state.habits.length);
            el.completedCount.textContent = String(done);
            el.progressValue.textContent = pct + "%";
            el.progressFill.style.width = pct + "%";

            const labelDate = new Date(state.month + "-01T00:00:00");
            el.monthTitle.textContent = labelDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        }

        function renderTable() {
            const days = monthDates(state.month).map((dateText) => {
                const d = new Date(dateText + "T00:00:00");
                return {
                    dateText,
                    weekday: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
                    dayNum: d.getDate()
                };
            });

            const weeks = groupWeeks(days);
            let html = "<thead><tr><th class='left' rowspan='2'>My Habits</th>";
            weeks.forEach((w, i) => {
                html += `<th class='week' colspan='${w.length}'>Week ${i + 1}</th>`;
            });
            html += "</tr><tr>";
            days.forEach((d) => {
                html += `<th class='day'>${d.weekday}<br>${d.dayNum}</th>`;
            });
            html += "</tr></thead><tbody>";

            if (state.habits.length === 0) {
                html += `<tr><th class='left'>No habits</th><td colspan='${days.length}'>Add your first habit above</td></tr>`;
            } else {
                state.habits.forEach((habit) => {
                    const tag = habit.mode === "quantity"
                        ? `<span class='chip'>Target ${habit.target} ${escapeHtml(habit.unit)}</span>`
                        : "<span class='chip'>Done</span>";

                    html += "<tr>";
                    html += `<th class='left'><div class='habit-line'><div><div class='habit-title'><strong>${escapeHtml(habit.name)}</strong>${tag}</div></div><div class='habit-actions'><button class='action-btn edit-btn' data-edit='${habit.id}' type='button'><span class='text'>Edit</span><span class='icon'><svg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'><path d='M290.74 93.24l128 128L142.62 497.38l-128 32 32-128L290.74 93.24zM497.94 74.17L437.83 14.06c-18.75-18.75-49.14-18.75-67.88 0l-56.57 56.57 128 128 56.57-56.57c18.74-18.74 18.74-49.13-.01-67.89z'/></svg></span></button><button class='action-btn edit-btn' data-history='${habit.id}' type='button'><span class='text'>History</span><span class='icon'><svg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'><path d='M500 240c0 136.967-111.033 248-248 248S4 376.967 4 240 115.033-8 252-8s248 111.033 248 248zM227 120v144.5l120.5 71.4 24-40.7-95.5-56.5V120h-49z'/></svg></span></button><button class='action-btn del-btn' data-del='${habit.id}' type='button'><span class='text'>Delete</span><span class='icon'><svg viewBox='0 0 448 512' xmlns='http://www.w3.org/2000/svg'><path d='M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.2 0 284.2 0H163.8c-12 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339.8C54.7 492.5 74.7 512 99.5 512h249c24.8 0 44.8-19.5 46.3-44.2L416 128z'/></svg></span></button></div></div></th>`;

                    days.forEach((day, idx) => {
                        const complete = isComplete(habit, day.dateText);
                        if (habit.mode === "quantity") {
                            const value = getValue(day.dateText, habit.id);
                            html += `<td class='${complete ? "done" : ""}'><input class='num' type='number' min='0' step='1' data-date='${day.dateText}' data-habit='${habit.id}' value='${value === null ? "" : value}'></td>`;
                        } else {
                            const checked = !!getValue(day.dateText, habit.id);
                            const idBase = `chk_${habit.id}_${idx}`;
                            html += `<td class='${complete ? "done" : ""}'><input class='simple-check' id='${idBase}' type='checkbox' data-date='${day.dateText}' data-habit='${habit.id}' ${checked ? "checked" : ""}></td>`;
                        }
                    });
                    html += "</tr>";
                });
            }

            html += "<tr class='sub'><th class='left'>Progress</th>";
            days.forEach((d) => {
                html += `<td>${progressForDate(d.dateText)}%</td>`;
            });
            html += "</tr>";

            html += "<tr class='sub'><th class='left'>Done</th>";
            days.forEach((d) => {
                html += `<td>${countDone(d.dateText)}</td>`;
            });
            html += "</tr>";

            html += "<tr class='sub'><th class='left'>Not Done</th>";
            days.forEach((d) => {
                html += `<td>${Math.max(state.habits.length - countDone(d.dateText), 0)}</td>`;
            });
            html += "</tr></tbody>";

            el.trackerTable.innerHTML = html;

            el.trackerTable.querySelectorAll("input[type='checkbox'][data-date]").forEach((input) => {
                input.addEventListener("change", (event) => {
                    setValue(event.target.dataset.date, event.target.dataset.habit, event.target.checked);
                    save();
                    render();
                });
            });

            el.trackerTable.querySelectorAll(".num").forEach((input) => {
                input.addEventListener("change", (event) => {
                    const value = event.target.value === "" ? null : Math.max(parseInt(event.target.value || "0", 10), 0);
                    setValue(event.target.dataset.date, event.target.dataset.habit, value);
                    save();
                    render();
                });
            });

            el.trackerTable.querySelectorAll("[data-del]").forEach((button) => {
                button.addEventListener("click", () => removeHabit(button.dataset.del));
            });

            el.trackerTable.querySelectorAll("[data-edit]").forEach((button) => {
                button.addEventListener("click", () => openEdit(button.dataset.edit));
            });

            el.trackerTable.querySelectorAll("[data-history]").forEach((button) => {
                button.addEventListener("click", () => openHistory(button.dataset.history));
            });
        }

        function renderWeekCircles() {
            const dates = weekDatesForMonth();
            el.weekCircles.innerHTML = dates.map((dateText) => {
                const d = new Date(dateText + "T00:00:00");
                const day = d.toLocaleDateString(undefined, { weekday: "short" });
                const dateLabel = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
                const pct = progressForDate(dateText);
                return `<div class='circle-card'><div class='ring' style='--p:${pct};'><span>${pct}%</span></div><small>${day}</small><br><small>${dateLabel}</small></div>`;
            }).join("");
        }

        function renderAnalysis() {
            if (state.habits.length === 0) {
                el.analysisList.innerHTML = "<p class='hint'>Add habits to see analysis.</p>";
                return;
            }

            const dates = monthDates(state.month);
            const goal = dates.length;
            el.analysisList.innerHTML = state.habits.map((habit) => {
                const actual = dates.reduce((sum, dateText) => sum + (isComplete(habit, dateText) ? 1 : 0), 0);
                const pct = goal === 0 ? 0 : Math.round((actual / goal) * 100);
                return `<article class='a-item'><header><strong>${escapeHtml(habit.name)}</strong><span>${actual}/${goal}</span></header><div class='bar'><div style='width:${pct}%'></div></div><p class='hint'>Progress ${pct}%</p></article>`;
            }).join("");
        }

        function renderTrend() {
            const ctx = el.trendCanvas.getContext("2d");
            const width = el.trendCanvas.width;
            const height = el.trendCanvas.height;
            ctx.clearRect(0, 0, width, height);

            const values = weekDatesForMonth().map((d) => progressForDate(d));
            const px = 20;
            const py = 16;
            const uw = width - px * 2;
            const uh = height - py * 2;

            ctx.strokeStyle = "rgba(191, 230, 198, 0.2)";
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i += 1) {
                const y = py + (uh / 4) * i;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(width - px, y);
                ctx.stroke();
            }

            if (values.length === 0) return;
            const step = values.length > 1 ? uw / (values.length - 1) : 0;

            ctx.beginPath();
            values.forEach((v, i) => {
                const x = px + step * i;
                const y = py + uh - (v / 100) * uh;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = "#60e28e";
            ctx.lineWidth = 2.6;
            ctx.stroke();

            ctx.lineTo(px + step * (values.length - 1), height - py);
            ctx.lineTo(px, height - py);
            ctx.closePath();
            ctx.fillStyle = "rgba(96, 226, 142, 0.16)";
            ctx.fill();
        }

        function openEdit(habitId) {
            const habit = state.habits.find((h) => h.id === habitId);
            if (!habit) return;
            state.editingId = habitId;
            el.editName.value = habit.name;
            el.editModeToggle.checked = habit.mode === "quantity";
            el.editTarget.value = habit.mode === "quantity" ? habit.target : "";
            el.editUnit.value = habit.mode === "quantity" ? habit.unit : "";
            updateEditMode();
            el.editModal.classList.add("active");
        }

        function closeEditModal() {
            state.editingId = null;
            el.editModal.classList.remove("active");
        }

        function applyEdit() {
            const habit = state.habits.find((h) => h.id === state.editingId);
            if (!habit) {
                closeEditModal();
                return;
            }

            const name = el.editName.value.trim();
            if (!name) {
                alert("Habit name is required.");
                return;
            }

            const mode = el.editModeToggle.checked ? "quantity" : "binary";
            habit.name = name;
            habit.mode = mode;
            habit.target = mode === "quantity" ? Math.max(parseInt(el.editTarget.value || "0", 10), 1) : 1;
            habit.unit = mode === "quantity" ? (el.editUnit.value.trim() || "units") : "";

            save();
            closeEditModal();
            render();
        }

        function removeHabit(habitId) {
            const target = state.habits.find((h) => h.id === habitId);
            if (!target) return;

            const removedLogEntries = {};
            Object.keys(state.logs).forEach((dateText) => {
                if (state.logs[dateText] && Object.prototype.hasOwnProperty.call(state.logs[dateText], habitId)) {
                    removedLogEntries[dateText] = state.logs[dateText][habitId];
                }
            });

            state.lastDeleted = {
                habit: { ...target },
                logs: removedLogEntries,
                index: state.habits.findIndex((h) => h.id === habitId)
            };

            state.habits = state.habits.filter((h) => h.id !== habitId);
            Object.keys(state.logs).forEach((dateText) => {
                if (state.logs[dateText] && Object.prototype.hasOwnProperty.call(state.logs[dateText], habitId)) {
                    delete state.logs[dateText][habitId];
                }
            });

            showUndoToast(target.name);
            save();
            render();
        }

        function showUndoToast(habitName) {
            if (state.undoTimer) {
                window.clearTimeout(state.undoTimer);
            }
            el.undoText.textContent = `Deleted: ${habitName}`;
            el.undoToast.classList.add("show");
            state.undoTimer = window.setTimeout(() => {
                el.undoToast.classList.remove("show");
                state.lastDeleted = null;
                state.undoTimer = null;
            }, 4500);
        }

        function undoDeleteHabit() {
            if (!state.lastDeleted) return;
            const { habit, logs, index } = state.lastDeleted;
            state.habits.splice(Math.max(index, 0), 0, habit);
            Object.keys(logs).forEach((dateText) => {
                if (!state.logs[dateText]) state.logs[dateText] = {};
                state.logs[dateText][habit.id] = logs[dateText];
            });
            state.lastDeleted = null;
            if (state.undoTimer) {
                window.clearTimeout(state.undoTimer);
                state.undoTimer = null;
            }
            el.undoToast.classList.remove("show");
            save();
            render();
        }

        function openHistory(habitId) {
            const habit = state.habits.find((h) => h.id === habitId);
            if (!habit) return;
            state.historyHabitId = habitId;
            const dates = monthDates(state.month);
            const values = dates.map((dateText) => {
                if (habit.mode === "quantity") {
                    return Number(getValue(dateText, habit.id) || 0);
                }
                return isComplete(habit, dateText) ? 1 : 0;
            });
            el.historyMeta.textContent = habit.mode === "quantity"
                ? `${habit.name} (${habit.unit}) - this month`
                : `${habit.name} - done history this month`;
            drawHistoryChart(values, habit.mode === "quantity" ? habit.target : 1, habit.mode === "quantity");
            el.historyModal.classList.add("active");
        }

        function drawHistoryChart(values, target, isQuantity) {
            const canvas = el.historyCanvas;
            const ctx = canvas.getContext("2d");
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const px = 24;
            const py = 18;
            const uw = width - px * 2;
            const uh = height - py * 2;
            const maxVal = Math.max(isQuantity ? target : 1, ...values, 1);

            ctx.strokeStyle = "rgba(191, 230, 198, 0.2)";
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i += 1) {
                const y = py + (uh / 4) * i;
                ctx.beginPath();
                ctx.moveTo(px, y);
                ctx.lineTo(width - px, y);
                ctx.stroke();
            }

            if (values.length === 0) return;
            const step = values.length > 1 ? uw / (values.length - 1) : 0;

            ctx.beginPath();
            values.forEach((v, i) => {
                const x = px + step * i;
                const y = py + uh - (v / maxVal) * uh;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = "#60e28e";
            ctx.lineWidth = 2.4;
            ctx.stroke();

            if (isQuantity) {
                const lineY = py + uh - (target / maxVal) * uh;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(px, lineY);
                ctx.lineTo(width - px, lineY);
                ctx.strokeStyle = "rgba(47, 121, 255, 0.9)";
                ctx.lineWidth = 1.6;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        function loadJournal(dateText) {
            el.journalText.value = state.journals[dateText] || "";
        }

        function getValue(dateText, habitId) {
            if (!state.logs[dateText]) return null;
            if (!Object.prototype.hasOwnProperty.call(state.logs[dateText], habitId)) return null;
            return state.logs[dateText][habitId];
        }

        function setValue(dateText, habitId, value) {
            if (!state.logs[dateText]) state.logs[dateText] = {};
            if (value === null || value === false || value === "") {
                delete state.logs[dateText][habitId];
                if (Object.keys(state.logs[dateText]).length === 0) delete state.logs[dateText];
                return;
            }
            state.logs[dateText][habitId] = value;
        }

        function isComplete(habit, dateText) {
            const value = getValue(dateText, habit.id);
            if (habit.mode === "quantity") {
                return Number(value || 0) >= Number(habit.target || 1);
            }
            return !!value;
        }

        function countDone(dateText) {
            return state.habits.reduce((sum, habit) => sum + (isComplete(habit, dateText) ? 1 : 0), 0);
        }

        function progressForDate(dateText) {
            if (state.habits.length === 0) return 0;
            return Math.round((countDone(dateText) / state.habits.length) * 100);
        }

        function monthDates(monthText) {
            const [yearStr, monthStr] = monthText.split("-");
            const year = Number(yearStr);
            const monthIndex = Number(monthStr) - 1;
            const last = new Date(year, monthIndex + 1, 0).getDate();
            const list = [];
            for (let day = 1; day <= last; day += 1) {
                list.push(`${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`);
            }
            return list;
        }

        function groupWeeks(days) {
            const groups = [];
            let chunk = [];
            days.forEach((d, i) => {
                chunk.push(d);
                if (chunk.length === 7 || i === days.length - 1) {
                    groups.push(chunk);
                    chunk = [];
                }
            });
            return groups;
        }

        function weekDatesForMonth() {
            const dates = monthDates(state.month);
            if (dates.length === 0) return [];

            const today = todayDate();
            const index = dates.includes(today) ? dates.indexOf(today) : 0;
            const weekStart = Math.floor(index / 7) * 7;
            const slice = dates.slice(weekStart, weekStart + 7);

            while (slice.length < 7) {
                const last = new Date(slice[slice.length - 1] + "T00:00:00");
                last.setDate(last.getDate() + 1);
                slice.push(formatDate(last));
            }
            return slice;
        }

        function exportPayload() {
            return {
                month: state.month,
                palette: state.palette,
                habits: state.habits,
                logs: state.logs,
                journals: state.journals
            };
        }

        async function deriveAesKey(password, salt) {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                "raw",
                enc.encode(password),
                "PBKDF2",
                false,
                ["deriveKey"]
            );
            return crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt,
                    iterations: 120000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt", "decrypt"]
            );
        }

        async function encryptPayload(payload, password) {
            const enc = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await deriveAesKey(password, salt);
            const cipherBuffer = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                key,
                enc.encode(JSON.stringify(payload))
            );

            const merged = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
            merged.set(salt, 0);
            merged.set(iv, salt.length);
            merged.set(new Uint8Array(cipherBuffer), salt.length + iv.length);

            let binary = "";
            merged.forEach((b) => { binary += String.fromCharCode(b); });
            return "enc:" + btoa(binary);
        }

        async function decryptPayload(code, password) {
            const raw = atob(code.slice(4));
            const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
            const salt = bytes.slice(0, 16);
            const iv = bytes.slice(16, 28);
            const data = bytes.slice(28);
            const key = await deriveAesKey(password, salt);
            const plainBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                data
            );
            const json = new TextDecoder().decode(plainBuffer);
            return JSON.parse(json);
        }

        function applyImportedPayload(parsed) {
            if (!parsed || !Array.isArray(parsed.habits) || typeof parsed.logs !== "object") {
                throw new Error("Invalid payload");
            }

            state.month = typeof parsed.month === "string" ? parsed.month : currentMonth();
            state.habits = parsed.habits.map((h) => ({
                id: h.id || makeId(),
                name: h.name || "Untitled",
                mode: h.mode === "quantity" ? "quantity" : "binary",
                target: h.mode === "quantity" ? Math.max(parseInt(h.target || "1", 10), 1) : 1,
                unit: h.mode === "quantity" ? (h.unit || "units") : ""
            }));
            state.logs = parsed.logs || {};
            state.journals = parsed.journals && typeof parsed.journals === "object" ? parsed.journals : {};
            state.palette = paletteOrder.includes(parsed.palette) ? parsed.palette : "signature";
            el.monthPicker.value = state.month;
            applyPalette(state.palette);
        }

        function importFile(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result));
                    applyImportedPayload(parsed);
                    save();
                    render();
                    loadJournal(el.journalDate.value || todayDate());
                } catch (_e) {
                    alert("Could not import this file.");
                } finally {
                    event.target.value = "";
                }
            };
            reader.readAsText(file);
        }

        function encodePayload(payload) {
            const json = JSON.stringify(payload);
            const bytes = new TextEncoder().encode(json);
            let binary = "";
            bytes.forEach((b) => {
                binary += String.fromCharCode(b);
            });
            return btoa(binary);
        }

        function decodePayload(code) {
            const binary = atob(code);
            const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
            const json = new TextDecoder().decode(bytes);
            return JSON.parse(json);
        }

        function save() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(exportPayload()));
        }

        function load() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                applyImportedPayload(parsed);
            } catch (_e) {
                state.month = currentMonth();
                state.habits = [];
                state.logs = {};
                state.journals = {};
                state.palette = "signature";
            }
        }

        function applyPalette(paletteName) {
            document.body.setAttribute("data-theme", paletteName);
            el.themeCycleBtn.textContent = `Theme: ${paletteLabel[paletteName]}`;
        }

        function todayDate() {
            return formatDate(new Date());
        }

        function currentMonth() {
            return todayDate().slice(0, 7);
        }

        function formatDate(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }

        function makeId() {
            if (window.crypto && typeof window.crypto.randomUUID === "function") {
                return window.crypto.randomUUID();
            }
            return "h_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
        }

        function escapeHtml(value) {
            return String(value)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");
        }

