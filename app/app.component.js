System.register(['rxjs/Rx', 'angular2/core', 'angular2/http', 'angular2/router'], function(exports_1) {
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1, http_1, router_1;
    var oAuthClientId, App;
    return {
        setters:[
            function (_1) {},
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            },
            function (router_1_1) {
                router_1 = router_1_1;
            }],
        execute: function() {
            oAuthClientId = '107429331396-6qrgk7rks33ab1v5nar5fcoi7vt2a526.apps.googleusercontent.com';
            App = (function () {
                function App(http) {
                    var _this = this;
                    this.http = http;
                    this.googleAccessToken = undefined;
                    this.groups = {};
                    this.status = {
                        success: true,
                        importing: false,
                        coursesTotal: 0,
                        coursesLoaded: 0,
                        msg: ''
                    };
                    this.objectKeys = Object.keys;
                    http.get('//api.rozklad.org.ua/v2/groups/?filter={"showAll":true}')
                        .map(function (res) { return res.json(); })
                        .subscribe(function (res) {
                        // create a map of group names and ids (some groups can have same names, so we store ids in array)
                        var ids = {};
                        res.data.forEach(function (group) {
                            if (group.group_full_name in ids) {
                                ids[group.group_full_name].push(group.group_id);
                            }
                            else {
                                ids[group.group_full_name] = [group.group_id];
                            }
                        });
                        Object.keys(ids).forEach(function (groupName) {
                            if (ids[groupName].length === 1) {
                                _this.groups[groupName] = ids[groupName][0];
                            }
                            else {
                                // append group id to group name if there are multiple groups with this name
                                ids[groupName].forEach(function (groupID) {
                                    var newName = groupName + " [" + groupID + "]";
                                    _this.groups[newName] = groupID;
                                });
                            }
                        });
                    });
                }
                Object.defineProperty(App.prototype, "groupName", {
                    get: function () { return localStorage.getItem('groupName') || ''; },
                    set: function (groupName) { localStorage.setItem('groupName', groupName); },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(App.prototype, "calendarName", {
                    get: function () { return localStorage.getItem('calendarName') || 'KPI Schedule'; },
                    set: function (calendarName) { localStorage.setItem('calendarName', calendarName); },
                    enumerable: true,
                    configurable: true
                });
                App.prototype.createCalendarEvent = function (course) {
                    var isSecondSemester = moment().month() < 6;
                    var firstStudyMonth = !isSecondSemester ? 8 : 1; // september vs february
                    var firstStudyDay = !isSecondSemester ? 1 : moment([moment().year(), firstStudyMonth, 1, 0, 0]).day(8).date();
                    if (moment().year() === 2016 && isSecondSemester) {
                        firstStudyDay = 15;
                    }
                    var date = moment([moment().year(), firstStudyMonth, firstStudyDay, 0, 0]).day(course.day_number);
                    // shift the date of first course day by a week for second-week schedule (or for first week for 2018 and later)
                    if (course.lesson_week === (moment().year() < 2018 ? '2' : '1')) {
                        date.add(7, 'day');
                    }
                    // date.day() can move the date backwards. If it did move the date to august - fix it back to september.
                    if (date.date() > 14 && !isSecondSemester) {
                        date.add(14, 'day');
                    }
                    var daystr = date.format('DD');
                    return {
                        summary: course.lesson_name,
                        description: course.lesson_name + " (" + course.lesson_type + ")\n\u0412\u0438\u043A\u043B\u0430\u0434\u0430\u0447: " + course.teacher_name,
                        start: {
                            dateTime: "" + moment().year() + (isSecondSemester ? '-02-' : '-09-') + daystr + "T" + course.time_start,
                            timeZone: 'Europe/Kiev'
                        },
                        end: {
                            dateTime: "" + moment().year() + (isSecondSemester ? '-02-' : '-09-') + daystr + "T" + course.time_end,
                            timeZone: 'Europe/Kiev'
                        },
                        recurrence: [
                            ("RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=" + moment().year() + (isSecondSemester ? '0610' : '1231') + "T235959Z")
                        ],
                        location: "\u041D\u0422\u0423\u0423 \"\u041A\u041F\u0406\" (" + course.lesson_room + ")"
                    };
                };
                App.prototype.getGoogleTokenPromise = function () {
                    var _this = this;
                    if (this.googleAccessToken) {
                        return Promise.resolve(this.googleAccessToken);
                    }
                    return new Promise(function (resolve, reject) {
                        var tab = window.open('https://accounts.google.com/o/oauth2/v2/auth?' +
                            'scope=https://www.googleapis.com/auth/calendar&' +
                            'response_type=token&' +
                            ("client_id=" + oAuthClientId + "&") +
                            ("redirect_uri=" + document.location.protocol + "//" + document.location.host + "/authsuccess"), "Authentication", "height=1000,width=1000,modal=yes,alwaysRaised=yes");
                        var timer = setInterval(function () {
                            var successMatches = /^#access_token=(.*)&token_type/.exec(tab.document.location.hash);
                            if (successMatches) {
                                _this.googleAccessToken = successMatches[1]; // async or promise
                                tab.close();
                                clearInterval(timer);
                                resolve(_this.googleAccessToken);
                            }
                            else if (tab.document.location.hash === '#error=access_denied') {
                                tab.close();
                                reject('You have to allow access to your Google profile to use this app.');
                            }
                        }, 100);
                    });
                };
                App.prototype.import = function () {
                    var _this = this;
                    this.status.importing = true;
                    this.getGoogleTokenPromise().then(function (token) {
                        _this.http.get("//api.rozklad.org.ua/v2/groups/" + _this.groups[_this.groupName] + "/lessons")
                            .map(function (res) { return res.json(); })
                            .subscribe(function (response) {
                            var courses = response.data;
                            _this.status.coursesTotal = courses.length;
                            _this.status.msg = 'Creating calendar';
                            _this.status.success = true;
                            var contentTypeJSONHeader = new http_1.Headers();
                            contentTypeJSONHeader.append('Content-Type', 'application/json');
                            var calendar = {
                                summary: _this.calendarName,
                                location: 'NTUU KPI, Kyiv, Ukraine'
                            };
                            _this.http.post("https://www.googleapis.com/calendar/v3/calendars/?access_token=" + token, JSON.stringify(calendar), { headers: contentTypeJSONHeader })
                                .map(function (res) { return res.json(); })
                                .subscribe(function (calendar) {
                                var ps = courses.map(function (course) {
                                    return _this.http.post("https://www.googleapis.com/calendar/v3/calendars/" + calendar.id + "/events?access_token=" + token, JSON.stringify(_this.createCalendarEvent(course)), { headers: contentTypeJSONHeader })
                                        .retry(5);
                                });
                                var loaded = 0;
                                var errors = 0;
                                var updateStatus = function () {
                                    _this.status.coursesLoaded = loaded + errors;
                                    _this.status.success = errors === 0;
                                    if (loaded + errors !== ps.length) {
                                        _this.status.msg = "creating schedule: " + loaded + "/" + ps.length;
                                        if (errors) {
                                            _this.status.msg += "errors - " + errors;
                                        }
                                    }
                                    else if (loaded === ps.length) {
                                        _this.status.importing = false;
                                        _this.status.msg = 'completed!';
                                    }
                                    else {
                                        _this.status.msg = 'error while creating the calendar!';
                                    }
                                };
                                for (var _i = 0; _i < ps.length; _i++) {
                                    var p = ps[_i];
                                    p.subscribe(function () {
                                        ++loaded;
                                        updateStatus();
                                    }, function () {
                                        ++errors;
                                        updateStatus();
                                    });
                                }
                            }, function (err) {
                                _this.status.importing = false;
                                _this.status.msg = 'error while creating the calendar!';
                                _this.status.success = false;
                            });
                        }, function (err) {
                            _this.status.importing = false;
                            if (err.status === 404) {
                                _this.status.msg = 'group doesn\'t exist!';
                            }
                            else {
                                _this.status.msg = 'error while accessing API at https://rozklad.org.ua!';
                            }
                            _this.status.success = false;
                        });
                    }, alert);
                };
                App = __decorate([
                    core_1.Component({
                        selector: 'app',
                        templateUrl: 'app/app.component.html',
                        styleUrls: ['app/app.component.css'],
                        directives: [router_1.ROUTER_DIRECTIVES],
                        providers: [http_1.HTTP_PROVIDERS]
                    }), 
                    __metadata('design:paramtypes', [http_1.Http])
                ], App);
                return App;
            })();
            exports_1("App", App);
        }
    }
});
//# sourceMappingURL=app.component.js.map