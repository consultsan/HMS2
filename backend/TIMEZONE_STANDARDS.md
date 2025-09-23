# 🕐 Timezone Standards and Guidelines

## **Overview**
This document outlines the timezone handling standards for the HMS backend system to ensure consistency across all date/time operations.

## **🎯 Core Principles**

### **1. Database Storage**
- **All dates/times are stored in UTC** in the database
- **Never store local time** in the database
- **Use `DateTime` type** from Prisma for all date/time fields

### **2. Display and User Interface**
- **All user-facing dates/times are displayed in IST (Asia/Kolkata)**
- **Use the `TimezoneUtil` utility** for all date/time formatting
- **Never hardcode timezone strings** - use the utility constants

### **3. API Responses**
- **Return dates in ISO format** for API responses
- **Let the frontend handle timezone conversion** for display
- **Include timezone information** when needed

## **🔧 TimezoneUtil Usage**

### **Import the Utility**
```typescript
import { TimezoneUtil } from '../utils/timezone.util';
// Or import specific functions
import { formatDateIST, formatTimeIST, toIST } from '../utils/timezone.util';
```

### **Common Operations**

#### **Format Date for Display**
```typescript
// Format date in IST
const formattedDate = TimezoneUtil.formatDateIST(date, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
// Result: "23 September 2024"
```

#### **Format Time for Display**
```typescript
// Format time in IST
const formattedTime = TimezoneUtil.formatTimeIST(date);
// Result: "7:45 PM"
```

#### **Convert UTC to IST**
```typescript
// Convert UTC date to IST
const istDate = TimezoneUtil.toIST(utcDate);
```

#### **Database Queries**
```typescript
// Create date range for database queries
const { start, end } = TimezoneUtil.createDateRangeUTC(date);
// Use start and end for gte/lte queries
```

## **📋 Implementation Guidelines**

### **✅ DO**
- Use `TimezoneUtil` for all date/time operations
- Store dates in UTC in the database
- Display dates in IST to users
- Use consistent formatting across the application
- Test timezone conversions thoroughly

### **❌ DON'T**
- Hardcode timezone strings like "Asia/Kolkata"
- Store local time in the database
- Mix different timezone handling approaches
- Use `new Date()` without timezone consideration
- Assume system timezone for user display

## **🔍 Common Patterns**

### **1. WhatsApp Messages**
```typescript
// Convert appointment time to IST for WhatsApp
const appointmentIST = TimezoneUtil.toIST(appointment.scheduledAt);
const appointmentTime = TimezoneUtil.formatTimeIST(appointment.scheduledAt);

await sendAppointmentNotification(phone, {
  appointmentDate: appointmentIST,
  appointmentTime: appointmentTime
});
```

### **2. Database Queries**
```typescript
// Query appointments for a specific date
const queryDate = TimezoneUtil.parseAsUTC(dateString);
const { start, end } = TimezoneUtil.createDateRangeUTC(queryDate);

const appointments = await prisma.appointment.findMany({
  where: {
    scheduledAt: {
      gte: start,
      lte: end
    }
  }
});
```

### **3. PDF Generation**
```typescript
// Format dates in PDFs
const prescriptionDate = TimezoneUtil.formatDateIST(prescription.createdAt, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

### **4. Reminder System**
```typescript
// Get current time in IST
const nowIST = TimezoneUtil.nowIST();
const nowUTC = TimezoneUtil.nowUTC();

// Calculate 3 hours from now
const threeHoursFromNow = new Date(nowIST.getTime() + (3 * 60 * 60 * 1000));
```

## **🚨 Critical Issues Fixed**

### **1. Appointment Confirmation**
- **Issue**: Double timezone conversion causing wrong dates
- **Fix**: Use `TimezoneUtil.toIST()` for date conversion
- **Result**: Correct date and time in WhatsApp messages

### **2. Reminder System**
- **Issue**: Inconsistent timezone handling
- **Fix**: Use `TimezoneUtil` for all time calculations
- **Result**: Accurate 3-hour reminders

### **3. PDF Generation**
- **Issue**: Missing timezone specification
- **Fix**: Use `TimezoneUtil.formatDateIST()`
- **Result**: Consistent date formatting in PDFs

## **🧪 Testing**

### **Test Cases**
1. **Appointment Booking**: Verify correct time storage and display
2. **WhatsApp Messages**: Check date/time accuracy
3. **Reminder System**: Test 3-hour calculation accuracy
4. **PDF Generation**: Verify date formatting
5. **Database Queries**: Test date range queries

### **Test Data**
- **Input**: 23 Sep 2024, 7:45 PM IST
- **Expected Storage**: 23 Sep 2024, 2:15 PM UTC
- **Expected Display**: 23 Sep 2024, 7:45 PM IST

## **📚 References**

- [MDN Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Prisma DateTime](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datetime)
- [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

## **🔄 Migration Guide**

### **For Existing Code**
1. **Replace hardcoded timezone strings** with `TimezoneUtil.IST_TIMEZONE`
2. **Replace manual date formatting** with `TimezoneUtil` methods
3. **Update database queries** to use `TimezoneUtil.createDateRangeUTC()`
4. **Test all date/time operations** thoroughly

### **Example Migration**
```typescript
// Before
const formattedDate = new Date(date).toLocaleDateString("en-GB", {
  timeZone: "Asia/Kolkata"
});

// After
const formattedDate = TimezoneUtil.formatDateIST(date);
```

---

**Last Updated**: September 2024  
**Version**: 1.0  
**Status**: ✅ Implemented and Tested
