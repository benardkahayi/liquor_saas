# liquor-saas

<!-- Written by Euron Code project setup. Run /init to let the model fill in the details. -->

Stack: not detected

## Commands
- (none found in the manifests yet)

## Layout
```
backend/  (78 files)
frontend/  (67 files)
README.md
```

Entry points: backend/src/app.ts, backend/src/server.ts, frontend/src/App.tsx, frontend/src/main.tsx

## Conventions
- (add the conventions of this project here)
- ROLE: Senior Full-Stack SaaS Architect and Software Engineer

You are a senior software engineer specializing in multi-tenant SaaS platforms, business management systems, financial workflows, database architecture, and modern web applications.

Your task is to extend my EXISTING Business Management SaaS project by implementing a professional **Restaurant & Canteen Management Module** suitable for small and medium-sized food businesses in Tanzania.

You are working inside my existing repository:

`C:\Users\ABLessings\liquor-saas`

This is an existing multi-tenant SaaS application. It already has a Liquor Management module and other shared functionality.

**IMPORTANT: You are extending an existing application, NOT creating a new application.**

---

# 1. FIRST: UNDERSTAND THE EXISTING PROJECT

Before modifying anything:

1. Inspect the entire project structure.
2. Identify the frontend framework, backend framework, database, ORM, and API architecture.
3. Inspect the existing authentication and authorization system.
4. Understand how tenants and business types are created and managed.
5. Understand how tenant-specific data is isolated.
6. Inspect the existing dashboard, layout, sidebar, navigation, API client, reusable components, and design system.
7. Examine existing products, inventory, sales, customers, suppliers, expenses, reports, and settings modules.
8. Inspect existing database models, migrations, controllers, routes, services, and middleware.
9. Identify how business subscriptions, plans, and permissions work.
10. Identify the current testing and deployment setup.

Do not assume a particular backend framework or database. Discover what the repository actually uses.

Before implementing anything, provide a short architecture report explaining:

- Existing technology stack.
- Existing application architecture.
- Database structure.
- Authentication and tenant-isolation approach.
- Existing reusable modules.
- Files that need to be created or modified.
- Potential risks and how you will avoid breaking existing functionality.

Do not modify the existing code during this initial inspection.

---

# 2. MAIN OBJECTIVE

Implement a complete Restaurant & Canteen Management Module.

The module should support businesses such as:

- Mama Ntilie food businesses.
- Small restaurants.
- College and university canteens.
- Cafeterias.
- Fast-food businesses.
- Takeaway food businesses.
- Small hotels serving meals.

The application should be easy to use by business owners, managers, cashiers, and restaurant attendants.

The interface must support Tanzanian business operations and use Tanzanian Shillings (TSh).

---

# 3. RESTAURANT MODULE FEATURES

## A. Restaurant Dashboard

Create a professional dashboard showing real business data.

Include:

- Today's total sales.
- Today's cash payments.
- Today's mobile money payments.
- Today's card payments, if supported.
- Outstanding customer debts.
- Today's expenses.
- Today's profit estimate.
- Total orders.
- Completed orders.
- Pending orders.
- Cancelled orders.
- Best-selling meals.
- Low-stock ingredients.
- Recent transactions.
- Recent orders.
- Sales trends.

Add date filters:

- Today.
- Yesterday.
- Last 7 days.
- Last 30 days.
- This month.
- Custom date range.

All dashboard figures must come from the database through the existing API architecture. Do not use hardcoded demonstration figures in production.

Clearly distinguish revenue, payments received, outstanding debt, expenses, and estimated profit.

## B. Food Menu Management

Allow restaurant owners to manage their food menu.

Features:

- Add food items.
- Edit food items.
- Delete or deactivate food items.
- Upload food images.
- Set food names and descriptions.
- Set selling prices.
- Categorize food.
- Set availability.
- Track preparation time if appropriate.

Example categories:

- Breakfast.
- Lunch.
- Dinner.
- Drinks.
- Snacks.
- Local foods.
- Other.

Example menu items:

- Chips.
- Chips Mayai.
- Wali.
- Maharage.
- Pilau.
- Nyama.
- Samaki.
- Ugali.
- Chapati.
- Soda.
- Water.
- Tea.

Support optional meal variations and add-ons, such as:

- Small / Medium / Large.
- Extra meat.
- Extra egg.
- Extra cheese.

Prevent invalid prices and duplicate menu records where appropriate.

## C. Order and Sales Management

This is one of the most important parts of the system.

Allow staff to:

1. Select menu items.
2. Specify quantities.
3. Add optional variations and extras.
4. Calculate totals automatically.
5. Select an existing customer or create a new one.
6. Choose order type.
7. Record payments.
8. Save and complete orders.
9. Print or display receipts.

Order types:

- Dine-in.
- Takeaway.
- Delivery.

Order statuses:

- Pending.
- Preparing.
- Ready.
- Completed.
- Cancelled.

Each order should have:

- Unique order number.
- Tenant reference.
- Customer.
- Order items.
- Quantities.
- Unit prices.
- Subtotals.
- Discounts, if permitted.
- Total amount.
- Amount paid.
- Outstanding balance.
- Payment status.
- Order status.
- Created by.
- Created date and time.

Preserve the original item name and selling price in order records. Historical orders must not change when menu prices are updated.

Support multiple orders without confusing the cashier.

## D. Table Management

Support restaurants that offer dine-in services.

Features:

- Create tables.
- Edit table details.
- Assign table numbers.
- Show table availability.
- Assign orders to tables.
- Track occupied tables.
- Release tables after orders are completed.

Table statuses:

- Available.
- Occupied.
- Reserved.

This feature should be optional so takeaway-only businesses can operate without configuring tables.

## E. Customer Management

Create a customer management section.

Features:

- Add customers.
- Edit customer details.
- Search customers.
- View customer order history.
- View total purchases.
- View outstanding debts.
- View payment history.

Customer information may include:

- Full name.
- Phone number.
- Email (optional).
- Address (optional).

Allow walk-in customers without forcing staff to create customer accounts.

## F. Payments and Customer Debts

This is a critical financial feature. Implement it carefully.

Support:

- Cash.
- M-Pesa.
- Tigo Pesa.
- Airtel Money.
- HaloPesa.
- Bank transfer.
- Card, if supported.

Support full payments and partial payments.

Example:

A customer orders food worth TSh 8,000.

Initial payment: TSh 5,000.

Outstanding debt: TSh 3,000.

Later, the customer pays TSh 2,000.

New outstanding debt: TSh 1,000.

The system must:

1. Record every payment independently.
2. Preserve the original order total.
3. Calculate outstanding balances accurately.
4. Display payment history.
5. Show the payment method.
6. Record the staff member who received payment.
7. Record payment dates and times.
8. Generate payment receipts.
9. Support multiple partial payments.
10. Support debt reports.
11. Prevent accidental duplicate payment submissions.
12. Prevent overpayments unless an explicitly designed credit/refund workflow supports them.

Payment records must be auditable.

Never silently overwrite old payment records.

Use database transactions when recording payments and updating related balances.

## G. Inventory and Ingredients Management

Restaurants need to track ingredients, not only finished products.

Create an ingredient inventory system.

Examples:

- Rice.
- Beans.
- Cooking oil.
- Flour.
- Potatoes.
- Meat.
- Fish.
- Eggs.
- Tomatoes.
- Onions.
- Sugar.
- Salt.

Features:

- Add ingredients.
- Update stock.
- Record stock purchases.
- Record stock adjustments.
- Track units of measurement.
- Set minimum stock levels.
- Display low-stock warnings.
- Record supplier information.
- View stock movement history.

Support units such as:

- Kilograms.
- Grams.
- Litres.
- Millilitres.
- Pieces.
- Packets.
- Bags.

### Recipe and ingredient consumption

Where practical, implement recipes that connect menu items to ingredients.

Example:

One plate of chips consumes:
- 0.3 kg potatoes.
- 0.05 litres cooking oil.

When an order is completed, deduct the corresponding ingredient quantities.

Important:

- Do not deduct ingredients twice.
- Cancelled orders must not consume stock.
- If an order is refunded or reversed, handle stock restoration through an auditable adjustment.
- Protect against negative stock unless the business explicitly enables that option.
- Record every stock movement.

If the existing inventory module can support this safely, reuse it. Otherwise, extend it without breaking existing inventory functionality.

## H. Suppliers and Purchases

Allow restaurants to manage ingredient suppliers.

Features:

- Add suppliers.
- Edit supplier details.
- Record purchases.
- Record purchase dates.
- Record quantities and prices.
- Track total purchase costs.
- Maintain purchase history.
- Update inventory after successful purchases.

Do not confuse supplier purchases with customer sales.

## I. Expenses Management

Allow business owners to record daily expenses.

Examples:

- Rent.
- Electricity.
- Water.
- Gas.
- Charcoal.
- Transport.
- Salaries.
- Internet.
- Cleaning materials.
- Other expenses.

Features:

- Expense categories.
- Expense description.
- Amount.
- Payment method.
- Date.
- Recorded by.
- Optional receipt attachment.

Expense reports must support date filtering.

## J. Reports and Analytics

Build useful reports:

- Daily sales report.
- Weekly sales report.
- Monthly sales report.
- Sales by menu item.
- Sales by category.
- Sales by payment method.
- Customer debt report.
- Payment collection report.
- Expenses report.
- Ingredient stock report.
- Stock movement report.
- Best-selling food items.
- Estimated profit report.

Allow date filtering and CSV/PDF export where the existing architecture supports it.

Make calculations consistent across dashboard and reports.

Clearly explain that profit estimates depend on recorded ingredient costs and expenses. Do not present revenue as profit.

## K. User Roles and Permissions

Integrate with the existing authentication and role-management system.

Potential roles:

- Business Owner.
- Manager.
- Cashier.
- Kitchen Staff.
- Inventory Staff.

Example permissions:

Owner:
- Full access.

Manager:
- Manage operations, staff, reports, menu, and inventory according to assigned permissions.

Cashier:
- Create orders.
- Receive payments.
- View permitted customer information.

Kitchen Staff:
- View orders.
- Update preparation status.
- No access to sensitive financial reports.

Inventory Staff:
- Manage ingredients, suppliers, and purchases.

Enforce permissions on the backend, not just by hiding frontend buttons.

Do not introduce a second authentication system.

---

# 4. MULTI-TENANT SAAS REQUIREMENTS

This is a multi-tenant application. Tenant isolation is mandatory.

Every restaurant record must belong to the correct tenant.

Apply tenant isolation to:

- Menu items.
- Orders.
- Order items.
- Customers.
- Payments.
- Debts.
- Tables.
- Ingredients.
- Recipes.
- Stock movements.
- Suppliers.
- Purchases.
- Expenses.
- Reports.

Critical requirements:

1. Derive tenant identity from the authenticated request using the existing tenant architecture.
2. Never trust a tenant ID supplied by the frontend.
3. Prevent one tenant from accessing another tenant's data.
4. Validate tenant ownership when accessing related records.
5. Enforce tenant isolation in every relevant query and mutation.
6. Enforce user permissions on the server.
7. Add database constraints and indexes where appropriate.
8. Add automated tests for cross-tenant access attempts.

Do not weaken or bypass the existing tenant architecture.

---

# 5. FRONTEND DESIGN REQUIREMENTS

Use the existing frontend stack and design system.

The application already uses React, TypeScript, Vite, Tailwind CSS, React Router, and Lucide React. Verify this before implementation and retain the actual project conventions.

Create a professional, modern, responsive restaurant dashboard.

Design goals:

- Clean SaaS interface.
- Modern sidebar navigation.
- Clear typography.
- Consistent spacing.
- Professional cards and tables.
- Responsive desktop, tablet, and mobile layouts.
- Accessible forms.
- Useful confirmation dialogs.
- Search and filtering.
- Clear success and error messages.
- Loading states.
- Empty states.
- Error states.

Use the existing shared layout, navigation, components, and API client.

Do not duplicate the entire application layout unnecessarily.

Restaurant navigation should include:

1. Dashboard.
2. Orders.
3. Food Menu.
4. Tables.
5. Customers.
6. Payments & Debts.
7. Ingredients.
8. Suppliers.
9. Purchases.
10. Expenses.
11. Reports.
12. Settings.

Hide or disable optional features appropriately for businesses that do not use them.

Use Tanzanian Shillings consistently, formatted clearly as TSh.

Support Kiswahili and English using the existing internationalization system if one exists. Do not create an unrelated translation architecture.

---

# 6. DATABASE AND BACKEND REQUIREMENTS

Before creating database tables:

- Inspect existing models and relationships.
- Reuse existing customers, suppliers, expenses, payments, or inventory functionality where appropriate.
- Avoid creating duplicate entities.
- Follow the current migration system.
- Add appropriate indexes and foreign keys.
- Define correct deletion behavior.
- Use transactions for financial and stock operations.
- Validate all incoming data.
- Return consistent API responses.
- Implement proper error handling.
- Avoid N+1 query problems.

Financial amounts must use a suitable exact decimal or integer representation. Do not use floating-point arithmetic for money.

For payment and stock operations, design for safe retries and concurrent requests.

Use the project's existing conventions for controllers, services, repositories, validation, and routes.

---

# 7. SECURITY AND RELIABILITY

Implement:

- Server-side validation.
- Authentication checks.
- Authorization checks.
- Tenant ownership checks.
- SQL injection protection through the existing database abstraction.
- Safe file upload validation.
- Proper error responses.
- Audit trails for sensitive financial changes.
- Protection against duplicate submissions.
- Safe handling of cancelled and refunded orders.
- Appropriate database constraints.

Never expose secrets, API keys, database credentials, or private environment variables.

Never commit `.env` files or secrets.

Do not weaken existing security middleware.

---

# 8. TESTING REQUIREMENTS

Create tests for important business workflows.

At minimum, test:

1. Creating a food item.
2. Updating a food item.
3. Creating an order.
4. Calculating order totals.
5. Recording a full payment.
6. Recording a partial payment.
7. Recording multiple payments.
8. Calculating outstanding debt.
9. Preventing invalid overpayment.
10. Preventing duplicate payment submissions.
11. Completing an order.
12. Deducting ingredients exactly once.
13. Cancelling an order.
14. Restoring stock through a valid reversal.
15. Recording expenses.
16. Generating correct sales reports.
17. Preventing cross-tenant data access.
18. Preventing unauthorized staff actions.

Run the available test suite and relevant build/type-check commands.

Do not claim tests pass unless you actually ran them.

---

# 9. IMPLEMENTATION STRATEGY

Do not attempt to build everything in one uncontrolled operation.

Work in phases.

### Phase 1: Project inspection
Understand the repository, architecture, database, and tenant system.

Deliver the architecture report before changing code.

### Phase 2: Architecture and database design
Design the restaurant module's database entities, relationships, API endpoints, and permission requirements.

Present the proposed design and identify which existing modules can be reused.

### Phase 3: Restaurant foundation
Implement:

- Restaurant routes.
- Navigation.
- Dashboard structure.
- Business-type integration.
- Tenant protection.

### Phase 4: Food menu and orders
Implement menu management, order creation, order status, and order history.

### Phase 5: Payments and debts
Implement full and partial payments, debt calculations, payment history, and receipts.

### Phase 6: Inventory and ingredients
Implement ingredients, stock movements, recipes, and consumption.

### Phase 7: Customers, suppliers, and expenses
Implement the remaining operational modules.

### Phase 8: Reports and analytics
Implement reliable business reports.

### Phase 9: Permissions and testing
Verify roles, tenant isolation, financial calculations, stock operations, and existing functionality.

### Phase 10: Final integration
Run tests, linting, type checking, and production builds. Fix issues and provide a final implementation report.

After each phase:

- Explain what you implemented.
- List files created or modified.
- Explain database changes.
- Report tests executed and their results.
- Identify remaining work.
- Wait for my approval before starting the next major phase.

---

# 10. STRICT DEVELOPMENT RULES

These rules are mandatory:

1. Do not create a new standalone application.
2. Do not replace the existing frontend or backend architecture.
3. Do not remove or damage the Liquor Management module.
4. Do not rewrite authentication or tenant management unnecessarily.
5. Do not create duplicate shared modules without first checking existing functionality.
6. Do not use hardcoded dashboard figures as production data.
7. Do not use mock APIs as a substitute for backend integration.
8. Do not silently change existing database structures.
9. Do not delete existing files without explaining why and receiving approval.
10. Do not install unnecessary packages.
11. Do not introduce a new technology stack without justification and approval.
12. Do not ignore TypeScript errors.
13. Do not hide errors with `any`, `@ts-ignore`, or similar shortcuts.
14. Do not claim a feature is complete if it is only a frontend mockup.
15. Keep changes small, organized, and maintainable.
16. Preserve existing functionality and coding conventions.
17. Ask for clarification when a business rule is genuinely unclear.
18. Never expose secrets or credentials in reports or terminal output.

When a feature requires a decision, explain the alternatives and recommend the safest approach.

---

# 11. FIRST ACTION — START NOW

For your first response, do ONLY the following:

1. Inspect the repository structure.
2. Inspect frontend and backend package/configuration files.
3. Identify the actual database and ORM.
4. Inspect authentication and tenant isolation.
5. Inspect existing shared modules.
6. Identify the correct place to integrate the restaurant module.
7. Produce a concise but technically detailed architecture report.

**Do not write or modify code yet.**

After presenting the report, wait for my approval to proceed with the database design and implementation.

The goal is to build a reliable, production-quality Restaurant & Canteen Management Module that becomes part of the existing multi-tenant Business SaaS platform.
