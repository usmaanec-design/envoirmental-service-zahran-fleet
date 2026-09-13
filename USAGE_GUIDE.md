# 🎯 Quick Start Guide - Using New Features

## ✨ **Toast Notifications**

### Setup (One-time in App.tsx)

```typescript
import { ToastProvider } from './components/ui/ToastContext';

function App() {
  return (
    <ToastProvider>
      {/* Your app */}
    </ToastProvider>
  );
}
```

### Usage in Components

```typescript
import { useToast } from './components/ui/ToastContext';

const MyComponent = () => {
  const toast = useToast();
  
  const handleSave = async () => {
    try {
      await saveData();
      toast.success('تم الحفظ بنجاح!'); // or 'Saved successfully!'
    } catch (error) {
      toast.error('فشل الحفظ'); // or 'Save failed'
    }
  };
  
  // Other toast types:
  toast.info('معلومة هامة'); // Info message
  toast.warning('تحذير!'); // Warning message
  
  return <button onClick={handleSave}>Save</button>;
};
```

---

## ✅ **Confirmation Dialogs**

### Setup (One-time in App.tsx)

```typescript
import { ConfirmProvider } from './components/ui/useConfirm';

function App() {
  return (
    <ConfirmProvider>
      {/* Your app */}
    </ConfirmProvider>
  );
}
```

### Usage in Components

```typescript
import { useConfirm } from './components/ui/useConfirm';

const MyComponent = () => {
  const { confirm } = useConfirm();
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'حذف السجل',
      message: 'هل أنت متأكد أنك تريد حذف هذا السجل؟',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      icon: 'fas fa-exclamation-triangle'
    });
    
    if (confirmed) {
      await deleteRecord();
      toast.success('تم الحذف بنجاح!');
    }
  };
  
  return <button onClick={handleDelete}>Delete</button>;
};
```

---

## ⏳ **Loading Skeletons**

### Simple Usage

```typescript
import { Skeleton, SkeletonTable, SkeletonCard } from './components/ui/Skeleton';

const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  if (loading) {
    return <SkeletonTable rows={10} columns={5} />;
  }
  
  return <Table data={data} />;
};
```

### Different Skeleton Types

```typescript
// For tables
<SkeletonTable rows={10} columns={4} />

// For cards
<SkeletonCard />

// For lists
<SkeletonList items={5} />

// For dashboard
<SkeletonDashboard />

// Custom skeleton
<Skeleton className="h-10 w-full rounded" count={3} />
```

---

## 🔗 **Complete Example**

```typescript
import React, { useState, useEffect } from 'react';
import { useToast } from './components/ui/ToastContext';
import { useConfirm } from './components/ui/useConfirm';
import { SkeletonTable } from './components/ui/Skeleton';

const VehicleManagementPage: React.FC = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { confirm } = useConfirm();
  
  useEffect(() => {
    loadVehicles();
  }, []);
  
  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await fetchVehicles();
      setVehicles(data);
      toast.success('تم تحميل المركبات بنجاح!');
    } catch (error) {
      toast.error('فشل تحميل المركبات');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteVehicle = async (vehicleId: string) => {
    const confirmed = await confirm({
      title: 'حذف المركبة',
      message: 'هل أنت متأكد أنك تريد حذف هذه المركبة؟',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      icon: 'fas fa-trash-alt'
    });
    
    if (confirmed) {
      try {
        await deleteVehicle(vehicleId);
        toast.success('تم حذف المركبة بنجاح!');
        loadVehicles(); // Reload list
      } catch (error) {
        toast.error('فشل حذف المركبة');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <SkeletonTable rows={10} columns={5} />
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">المركبات</h1>
      <table className="w-full">
        {/* Table content */}
      </table>
    </div>
  );
};
```

---

## 🎨 **Styling Tips**

### Custom Toast Colors

```typescript
// In ToastContext.tsx, modify getToastStyles:
const getToastStyles = (type: Toast['type']) => {
  switch (type) {
    case 'success':
      return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
    case 'error':
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
    case 'warning':
      return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    default:
      return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
  }
};
```

### Custom Skeleton Animation

```css
/* index.css */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.animate-pulse {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #e0e0e0 50%,
    #f0f0f0 100%
  );
  background-size: 1000px 100%;
}
```

---

## 📱 **Responsive Design**

### Toast on Mobile

```typescript
// Automatically adjusts for mobile
<div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm md:max-w-md">
  {/* Toasts */}
</div>
```

### Confirm Dialog on Mobile

```typescript
// Full-screen on mobile, centered on desktop
<div className="fixed inset-0 md:flex md:items-center md:justify-center">
  <div className="h-full md:h-auto w-full md:max-w-md md:rounded-lg">
    {/* Dialog content */}
  </div>
</div>
```

---

## 🌐 **Bilingual Support**

### Dynamic Messages

```typescript
const lang: 'ar' | 'en' = 'ar'; // from context or props

const messages = {
  ar: {
    saveSuccess: 'تم الحفظ بنجاح!',
    saveFailed: 'فشل الحفظ',
    deleteConfirm: 'هل أنت متأكد من الحذف؟',
    cancel: 'إلغاء',
    confirm: 'تأكيد'
  },
  en: {
    saveSuccess: 'Saved successfully!',
    saveFailed: 'Save failed',
    deleteConfirm: 'Are you sure you want to delete?',
    cancel: 'Cancel',
    confirm: 'Confirm'
  }
};

// Usage
toast.success(messages[lang].saveSuccess);

await confirm({
  message: messages[lang].deleteConfirm,
  confirmText: messages[lang].confirm,
  cancelText: messages[lang].cancel
});
```

---

## 🔧 **Troubleshooting**

### Toast Not Showing

**Problem:** Toast doesn't appear

**Solution:**
1. Check if `ToastProvider` wraps your app
2. Verify z-index is high enough (z-50)
3. Check console for errors

```typescript
// Debug
const toast = useToast();
console.log('Toast object:', toast); // Should not be undefined
```

### Confirm Dialog Not Working

**Problem:** Confirm always returns false

**Solution:**
1. Ensure `ConfirmProvider` wraps your app
2. Check if you're awaiting the result
3. Verify event handlers aren't preventing default

```typescript
// Correct usage
const result = await confirm({ ... });
if (result) { /* user clicked confirm */ }

// Wrong - not awaiting
const result = confirm({ ... }); // Returns Promise, not boolean
```

### Skeleton Not Animating

**Problem:** Skeleton appears static

**Solution:**
1. Check if Tailwind's `animate-pulse` is working
2. Verify CSS is loaded
3. Try custom animation

```css
/* Add to index.css if animate-pulse doesn't work */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 📊 **Performance Tips**

### Optimize Toast Count

```typescript
// Limit max toasts to prevent memory leaks
const MAX_TOASTS = 5;

setToasts(prev => {
  const updated = [...prev, newToast];
  return updated.slice(-MAX_TOASTS); // Keep only last 5
});
```

### Debounce Confirm Calls

```typescript
// Prevent multiple confirms from opening
const [isConfirming, setIsConfirming] = useState(false);

const handleAction = async () => {
  if (isConfirming) return;
  
  setIsConfirming(true);
  const result = await confirm({ ... });
  setIsConfirming(false);
  
  if (result) {
    // proceed
  }
};
```

### Lazy Load Skeletons

```typescript
// Only import when needed
const SkeletonTable = React.lazy(() => 
  import('./components/ui/Skeleton').then(m => ({ default: m.SkeletonTable }))
);

// Usage
<Suspense fallback={<div>Loading...</div>}>
  {loading && <SkeletonTable />}
</Suspense>
```

---

## 🎓 **Best Practices**

### 1. Consistent Toast Duration

```typescript
// Set standard durations
const TOAST_DURATION = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 6000
};
```

### 2. Meaningful Confirm Messages

```typescript
// ❌ Bad
confirm({ message: 'Are you sure?' });

// ✅ Good
confirm({ 
  message: 'هل أنت متأكد من حذف 5 مركبات؟ هذا الإجراء لا يمكن التراجع عنه.',
  title: 'تأكيد الحذف'
});
```

### 3. Skeleton Matching

```typescript
// Make skeleton match actual component structure
{loading ? (
  <div className="grid grid-cols-3 gap-4">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  <div className="grid grid-cols-3 gap-4">
    {cards.map(card => <Card key={card.id} {...card} />)}
  </div>
)}
```

---

## 🚀 **Next Features to Implement**

1. **Toast Queue** - Prevent toast overflow
2. **Undo Toast** - Add undo button to certain toasts
3. **Toast Positions** - top-left, top-right, bottom-left, etc.
4. **Persistent Confirms** - Save user preference "don't ask again"
5. **Skeleton Variants** - Light/dark mode optimized skeletons

---

**Happy Coding! 🎉**

For questions or issues, check the main IMPLEMENTATION_ROADMAP.md
