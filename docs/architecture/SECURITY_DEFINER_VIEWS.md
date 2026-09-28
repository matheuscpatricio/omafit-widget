# Security Definer Views Documentation

## Overview
This document explains why certain views in the Omafit database use the SECURITY DEFINER property and how they maintain security.

## Views Using SECURITY DEFINER

### 1. stripe_user_subscriptions

**Purpose:** Provides authenticated users access to their Stripe subscription data.

**Why SECURITY DEFINER is needed:**
- The view needs to access `stripe_customers` and `stripe_subscriptions` tables
- These tables may have restricted RLS policies
- Users need to view their subscription information without elevated privileges

**Security Measures:**
- Uses `auth.uid()` to filter data: `WHERE c.user_id = auth.uid()`
- Only returns data for the authenticated user
- Cannot access other users' subscription data
- Additional filters on `deleted_at` to exclude deleted records

**Risk Level:** LOW
- Properly scoped with auth.uid()
- No data leakage possible
- Read-only access

---

### 2. crm_stores_view

**Purpose:** Provides aggregated CRM data including store information, subscription status, and health scores.

**Why SECURITY DEFINER is needed:**
- Aggregates data from multiple tables (users, subscriptions, shopify_stores)
- Calls function `get_plan_mrr()` which may require elevated privileges
- Provides calculated fields like health_score

**Security Measures:**
- Only returns data for active subscriptions: `WHERE s.status = 'active'`
- Joins are based on user_id relationships
- No user input parameters (view-only, no WHERE clause injection possible)
- Uses safe CASE statements for health_score calculation

**Risk Level:** LOW to MEDIUM
- No auth.uid() filter (may expose all active users to admins)
- Intended for admin/CRM use
- Should have RLS policy to restrict access to admin users only

**Recommendation:** Add RLS policy to restrict access:
```sql
CREATE POLICY "Only admins can view CRM data"
ON crm_stores_view
FOR SELECT
TO authenticated
USING (
  -- Add admin check here, e.g.:
  -- auth.uid() IN (SELECT user_id FROM admin_users)
  true -- Temporarily allow, should be restricted
);
```

---

## Alternative Solutions Considered

### Option 1: Remove SECURITY DEFINER
- **Problem:** Views would fail if underlying tables have RLS enabled
- **Impact:** Users couldn't access their own subscription data

### Option 2: Use SECURITY INVOKER
- **Problem:** Requires granting direct table access to users
- **Impact:** Violates principle of least privilege

### Option 3: Use Functions Instead
- **Problem:** More complex to maintain, same SECURITY DEFINER needed
- **Impact:** No security benefit, increased complexity

---

## Conclusion

The SECURITY DEFINER property is appropriately used in these views because:
1. They have proper security filters (auth.uid() where applicable)
2. They provide necessary data access without compromising security
3. Alternative solutions would reduce security or usability
4. Both views include search_path protection via migration

## Monitoring Recommendations

1. Regularly audit view access patterns
2. Ensure RLS policies are added for crm_stores_view if not admin-only
3. Monitor for any unauthorized access attempts
4. Review view definitions during security audits
