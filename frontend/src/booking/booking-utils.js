export const STATUSES=['pending','confirmed','in_progress','completed','cancelled','no_show'];
export const statusLabel=value=>String(value).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
export const localDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const shiftDate=(value,days)=>{const d=new Date(value+'T12:00:00+08:00');d.setUTCDate(d.getUTCDate()+days);return localDate(d);};
export function calendarRange(date,view){
 if(view==='day')return {from:date,to:date};
 if(view==='week'){const weekday=new Date(date+'T12:00:00+08:00').getUTCDay();const from=shiftDate(date,-((weekday+6)%7));return {from,to:shiftDate(from,6)};}
 const from=date.slice(0,7)+'-01';const d=new Date(from+'T12:00:00+08:00');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return {from,to:localDate(d)};
}
export function calendarDays(range,view){let start=range.from;if(view==='month'){const weekday=new Date(start+'T12:00:00+08:00').getUTCDay();start=shiftDate(start,-((weekday+6)%7));}const days=[];for(let d=start;d<=range.to;d=shiftDate(d,1))days.push(d);if(view==='month')while(days.length%7)days.push(shiftDate(days.at(-1),1));return days;}
export function bookingCalendarFile(row){
 const escape=v=>String(v??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const stamp=v=>new Date(v.replace(' ','T')+'+08:00').toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Shining Pearl//SP Manager Booking//EN','BEGIN:VEVENT','UID:'+row.reference+'@shiningpearltinted.com','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp(row.starts_at),'DTEND:'+stamp(row.ends_at),'SUMMARY:'+escape('Shining Pearl · '+row.service_name),'DESCRIPTION:'+escape(row.reference+' · '+statusLabel(row.status)),'STATUS:'+(row.status==='cancelled'?'CANCELLED':row.status==='confirmed'?'CONFIRMED':'TENTATIVE'),'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
