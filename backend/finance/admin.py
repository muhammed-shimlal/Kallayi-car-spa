from django.contrib import admin
from .models import (
    RevenueCategory, ExpenseCategory, GeneralExpense, 
    ChemicalInventory, ChemicalUsageLog, CommissionRule, 
    PayrollEntry, DeferredRevenue, Invoice
)

admin.site.register(RevenueCategory)
admin.site.register(ExpenseCategory)
admin.site.register(GeneralExpense)
admin.site.register(ChemicalInventory)
admin.site.register(ChemicalUsageLog)
admin.site.register(CommissionRule)
admin.site.register(PayrollEntry)
admin.site.register(DeferredRevenue)
admin.site.register(Invoice)
