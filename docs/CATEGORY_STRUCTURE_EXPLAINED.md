# Category Structure Explained

## 🎯 Question: "Categories are on the basis of which?"

**Answer**: Categories are **BASED ON BUSINESS GROUPS** - Each Business Group has its own set of categories.

## 📊 Database Structure

### 1. Categories Table (Business Group Specific)
```
categories
├── id (PRIMARY KEY)
├── name
├── business_unit_group_id (FK → business_unit_groups.id) ← Belongs to a Business Group
├── description
├── created_at
├── updated_at
└── UNIQUE(name, business_unit_group_id) ← Same name allowed in different BGs
```

**Key Point**: Categories **BELONG TO** a specific Business Group. Each Business Group has its own set of categories.

### 2. Subcategories Table (Belongs to Category)
```
subcategories
├── id (PRIMARY KEY)
├── category_id (FK → categories.id) ← Belongs to a category
├── name
├── description
├── created_at
└── updated_at
```

**Key Point**: Subcategories belong to a **Category** (not to a Business Group).

### 3. Ticket Classification Mapping (The Bridge)
```
ticket_classification_mapping
├── id (PRIMARY KEY)
├── business_unit_group_id (FK → business_unit_groups.id) ← Links to Business Group
├── category_id (FK → categories.id) ← Links to Category
├── subcategory_id (FK → subcategories.id) ← Links to Subcategory
├── estimated_duration (minutes)
├── spoc_user_id (FK → users.id)
├── auto_title_template
└── UNIQUE(business_unit_group_id, category_id, subcategory_id)
```

**Key Point**: This is the **mapping table** that connects:
- **Business Group** + **Category** + **Subcategory** = A valid ticket classification
- Each combination can have its own estimated duration and SPOC

## 🔗 How It Works

### Example 1: Same Category Name, Different Business Groups

**Category Name**: "Hardware" (exists in multiple BGs)

**Database**:
| ID | Name | Business Group | Description |
|----|------|----------------|-------------|
| 10 | Hardware | Tech Delivery | Tech hardware issues |
| 11 | Hardware | Finance | Finance hardware issues |
| 12 | Hardware | HR | HR hardware issues |

**Subcategories**:
| ID | Category ID | Name | Business Group (via category) |
|----|-------------|------|-------------------------------|
| 50 | 10 | Laptop | Tech Delivery |
| 51 | 10 | Server | Tech Delivery |
| 52 | 11 | Laptop | Finance |
| 53 | 11 | Printer | Finance |

**Result**: Each business group has its own "Hardware" category with:
- Its own set of subcategories
- Independent management
- No conflicts with other business groups

### Example 2: Different Categories per Business Group

**Business Group**: "Tech Delivery"

**Available Categories** (via mapping):
- Hardware → Laptop, Desktop, Printer
- Software → Email, VPN, Database
- Network → WiFi, VPN, Firewall

**Business Group**: "Finance"

**Available Categories** (via mapping):
- Hardware → Laptop, Desktop
- Accounting → Invoice, Payment, Reconciliation
- Compliance → Audit, Report

**Result**: Each business group can have **different sets** of categories/subcategories available.

## 🎨 Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL CATEGORIES                         │
│  (Shared across all business groups)                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Hardware   │  │  Software   │  │  Network    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                 │
│    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐          │
│    │ Laptop  │      │ Email   │      │  WiFi   │          │
│    │ Desktop │      │ VPN     │      │ Firewall│          │
│    │ Printer │      │Database │      │ Router  │          │
│    └─────────┘      └─────────┘      └─────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MAPPED VIA
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          TICKET CLASSIFICATION MAPPING                       │
│  (Defines which categories are available per BG)            │
│                                                              │
│  Business Group + Category + Subcategory                    │
│  ├── Tech Delivery + Hardware + Laptop (120 min, John)     │
│  ├── Tech Delivery + Software + Email (60 min, John)       │
│  ├── Finance + Hardware + Laptop (90 min, Jane)            │
│  └── Finance + Accounting + Invoice (45 min, Jane)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ USED BY
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS GROUPS                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Tech Delivery │  │   Finance    │  │      HR      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 💡 Why This Design?

### Advantages:
1. **Reusability**: Same category (e.g., "Hardware") can be used across multiple business groups
2. **Flexibility**: Each business group can customize:
   - Which categories/subcategories are available
   - Estimated duration for each
   - Assigned SPOC for each
3. **Consistency**: Category names are consistent across the system
4. **Scalability**: Adding a new business group doesn't require creating new categories

### Real-World Example:

**Global Category**: "Laptop Issues"
- **Tech Delivery** uses it for development laptops (120 min, IT SPOC)
- **Finance** uses it for accounting laptops (60 min, Finance IT SPOC)
- **Sales** uses it for sales team laptops (90 min, Sales Support SPOC)

Same category, different handling per business group!

## 📋 Current Implementation

### Categories Are:
- ✅ **Business Group Specific** - Each category belongs to ONE business group
- ✅ **Unique per BG** - Category name is unique within a business group
- ✅ **Isolated** - Same category name can exist in different business groups
- ✅ **Tied to Business Groups** - Every category has a business_unit_group_id

### Subcategories Are:
- ✅ **Tied to Categories** - Each subcategory belongs to ONE category
- ✅ **Indirectly tied to Business Groups** - Through their parent category
- ✅ **Isolated per BG** - Same subcategory name can exist in different BGs (under different category instances)

### Mappings Define:
- ✅ **Which categories** are available for each Business Group
- ✅ **Which subcategories** are available for each Business Group
- ✅ **Estimated duration** for each BG + Category + Subcategory combination
- ✅ **SPOC** for each combination
- ✅ **Auto-title template** for tickets

## 🔍 How to View This in Your System

### In Admin Dashboard → Master Data Management:

1. **Categories Tab**: Shows all global categories
2. **Subcategories Tab**: Shows all subcategories (grouped by category)
3. **Mappings Tab**: Shows which BG has which Category/Subcategory combinations

### In Database:

```sql
-- View all categories (global)
SELECT * FROM categories;

-- View subcategories for a category
SELECT s.* 
FROM subcategories s
JOIN categories c ON s.category_id = c.id
WHERE c.name = 'Hardware';

-- View mappings for a business group
SELECT 
  bug.name as business_group,
  c.name as category,
  s.name as subcategory,
  tcm.estimated_duration,
  u.full_name as spoc
FROM ticket_classification_mapping tcm
JOIN business_unit_groups bug ON tcm.business_unit_group_id = bug.id
JOIN categories c ON tcm.category_id = c.id
JOIN subcategories s ON tcm.subcategory_id = s.id
LEFT JOIN users u ON tcm.spoc_user_id = u.id
WHERE bug.name = 'Tech Delivery';
```

## 🎯 Summary

**Categories are based on**: **NOTHING** - They are global entities!

**Categories are mapped to**: **Business Groups** (via `ticket_classification_mapping`)

**This means**:
- Categories exist independently
- Business Groups "use" categories by creating mappings
- Same category can be used by multiple business groups
- Each business group can customize the handling (duration, SPOC) for each category

## 📝 When Creating Tickets

When a user creates a ticket:
1. Select **Business Group** first
2. System shows **only categories** mapped to that Business Group
3. Select **Category**
4. System shows **only subcategories** mapped to that Business Group + Category
5. Ticket gets the **estimated duration** and **SPOC** from the mapping

This ensures users only see relevant categories for their business group!

## 🔄 Import Process

When you import from Excel:
```
Business Group | Category | Subcategory | Description
Tech Delivery  | Hardware | Laptop      | Laptop issues
```

The script:
1. ✅ Creates **global category** "Hardware" (if doesn't exist)
2. ✅ Creates **subcategory** "Laptop" under Hardware (if doesn't exist)
3. ✅ Creates **mapping** between "Tech Delivery" + "Hardware" + "Laptop"

Result: "Tech Delivery" can now use "Hardware → Laptop" for tickets!

---

**In short**: Categories are **global building blocks** that Business Groups can **pick and choose** from via mappings. This provides maximum flexibility and reusability! 🚀
