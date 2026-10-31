"""R3.40 s68 - dayKey ran once per call with a new Intl.DateTimeFormat (324 ms of a throttled start); one shared formatter gives the same text."""
MODULE_ID = 's68'


def apply(s, ctx):
    return ctx.once(s, "const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const get=t=>p.find(x=>x.type===t)?.value;",
                    "const p=(dayKey.f=dayKey.f||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'})).formatToParts(d);const get=t=>p.find(x=>x.type===t)?.value;")
