/**
 * AUD-04: every module that stores a company's records, loaded before a tenant
 * export so each collection is registered and included, opened or not.
 */
export const loadTenantModules = () =>
  Promise.all([
    import("./access-api"),
    import("./bank-import-api"),
    import("./change-orders-api"),
    import("./clients-api"),
    import("./crm-api"),
    import("./deals-api"),
    import("./documents-api"),
    import("./employees-api"),
    import("./expenses-api"),
    import("./leave-api"),
    import("./portal-api"),
    import("./project-templates-api"),
    import("./quotes-api"),
    import("./recurring-invoices-api"),
    import("./resource-bookings-api"),
    import("./reviews-api"),
    import("./satisfaction-api"),
    import("./saved-reports-api"),
    import("./settings-api"),
    import("./supplier-bills-api"),
    import("./suppliers-api"),
    import("./task-collab-api"),
    import("./timer-api"),
    import("./work-billing-api"),
    import("./work-projects-api"),
    import("./workspace-subscription-api"),
  ])
