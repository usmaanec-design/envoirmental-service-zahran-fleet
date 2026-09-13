# 👷 Labour Import Template & Debug Guide

## 🔍 **Issue Analysis:**
آپ کے labour records میں Iqama اور Labour ID columns میں "N/A" show ہو رہا ہے کیونکہ:

1. **Excel Column Headers** exactly match نہیں ہو رہے
2. **Empty Fields** کو "N/A" show کر رہا ہے
3. **Import Mapping** میں مسئلہ ہو سکتا ہے

## ✅ **Fixes Applied:**

### 1. **Enhanced Column Matching**
Labour import اب یہ column headers accept کرے گا:

**For Iqama Number:**
- Labour's Iqama ✅
- Iqama ✅  
- Labour Iqama ✅
- Iqama Number ✅
- ID Number ✅
- Worker Iqama ✅
- إقامة العامل ✅ (Arabic)
- رقم الإقامة ✅ (Arabic)

**For Labour ID:**
- Labour's Employee ID ✅
- Labour ID ✅
- Employee ID ✅
- Worker ID ✅
- EmpId ✅
- Labour Employee ID ✅
- معرف الموظف للعامل ✅ (Arabic)
- رقم الهوية ✅ (Arabic)

### 2. **Better Display Logic**
- Empty fields show "Not Provided" instead of "N/A"
- Improved field validation during import
- Better export data formatting

### 3. **Debug Logging**
- Console logs show exact mapping for each labour record
- Better error messages for missing data

---

## 📊 **Correct Excel Template:**

### **Option 1 - English Headers:**
```
Labour Name | Labour Iqama | Labour ID | Assigned Foreman | Assigned Supervisor
ABDUL KADWR | 2123456789   | EMP001    | EMON MIA        | Sohrab Khan
AMINUL ISLAM| 2234567890   | EMP002    | EMON MIA        | Sohrab Khan
```

### **Option 2 - Alternative Headers:**
```
Name        | Iqama Number | Employee ID | Foreman Name    | Supervisor Name
ABDUL KADWR | 2123456789   | EMP001     | EMON MIA        | Sohrab Khan
AMINUL ISLAM| 2234567890   | EMP002     | EMON MIA        | Sohrab Khan
```

### **Option 3 - Arabic Headers:**
```
اسم العامل    | رقم الإقامة  | رقم الهوية   | المراقب المباشر | المشرف
ABDUL KADWR | 2123456789  | EMP001    | EMON MIA      | Sohrab Khan
```

---

## 🔧 **How to Fix Existing Data:**

### **Method 1: Re-import with Correct Headers**
1. Download current labour export
2. Add Iqama and Employee ID columns with data
3. Use exact column headers from template above
4. Re-import the file

### **Method 2: Manual Edit (if small dataset)**
1. Use Edit Labour feature (if available)
2. Update each record individually

---

## 🎯 **Testing Steps:**

1. **Create Test Excel File:**
```
Labour Name     | Iqama Number | Employee ID | Assigned Foreman | Assigned Supervisor
TEST WORKER 1   | 1234567890   | EMP999      | Test Foreman     | Test Supervisor  
TEST WORKER 2   | 1234567891   | EMP998      | Test Foreman     | Test Supervisor
```

2. **Import the Test File:**
   - Go to Manpower Overview
   - Click Import
   - Select your test file

3. **Check Results:**
   - Open "All Labour Details"
   - Verify Iqama and Labour ID show actual values
   - Check browser console for debug logs

4. **Console Logs to Check:**
```
🔍 LABOUR DEBUG - Processed labour 1: {
  labourData: {
    name: "TEST WORKER 1",
    iqama: "1234567890",
    empId: "EMP999"
  },
  foremanName: "Test Foreman",
  supervisorName: "Test Supervisor"
}
```

---

## 📝 **Expected Results:**

After fixing, your labour table should show:
```
Labour Name      | Labour Iqama | Labour ID | Assigned Foreman | Assigned Supervisor
ABDUL KADWR MIAH | 1234567890   | EMP001    | EMON MIA         | Sohrab Khan
AMINUL ISLAM     | 1234567891   | EMP002    | EMON MIA         | Sohrab Khan
```

Instead of:
```
Labour Name      | Labour Iqama | Labour ID    | Assigned Foreman | Assigned Supervisor
ABDUL KADWR MIAH | N/A          | Not Provided | EMON MIA         | Sohrab Khan
```

---

## 🚨 **Common Issues & Solutions:**

### **Still Showing "Not Provided"?**
1. Check Excel column headers exactly match template
2. Make sure Iqama numbers are 10 digits
3. Employee IDs should not be empty
4. Check browser console for debug logs

### **Import Fails?**
1. Make sure Excel file is .xlsx format
2. First row should contain headers
3. No empty rows in data
4. All required fields (Labour Name) must be filled

### **Old Data Still Shows N/A?**
1. Old imported data needs to be re-imported with correct format
2. Or manually edit each labour record

---

**Status: ✅ Labour import enhanced with flexible column matching!**