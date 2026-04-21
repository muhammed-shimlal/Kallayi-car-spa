'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle, PlusCircle } from 'lucide-react';
import { useDashboard } from '@/components/admin/dashboard/context/DashboardContext';

// ─── Validation Schema ────────────────────────────────────────────────────────

const staffSchema = z.object({
    first_name: z.string().min(2, 'Full name must be at least 2 characters'),
    phone_number: z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .regex(/^\+?[0-9\s\-()]{10,15}$/, 'Enter a valid phone number'),
    role: z.enum(['WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER'], {
        required_error: 'Please select a role',
    }),
    base_salary: z
        .string()
        .optional()
        .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
            message: 'Salary must be a valid number',
        }),
    commission_rate: z
        .string()
        .optional()
        .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), {
            message: 'Commission must be between 0 and 100',
        }),
});

type StaffFormValues = z.infer<typeof staffSchema>;

// ─── Reusable Error Message ───────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="text-[#FF2A6D] text-[10px] font-bold uppercase tracking-widest mt-1.5 ml-2">
            {message}
        </p>
    );
}

// ─── Input class helper ───────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
    return `w-full bg-white/5 border py-4 px-6 rounded-xl text-white focus:outline-none transition-all mt-2 ${
        hasError
            ? 'border-[#FF2A6D] focus:border-[#FF2A6D] focus:ring-1 focus:ring-[#FF2A6D]'
            : 'border-white/10 focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF]'
    }`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffModal() {
    const { uiState, staffState } = useDashboard();
    const { isStaffModalOpen, setIsStaffModalOpen } = uiState;
    const { editingStaff, saveStaff } = staffState;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            first_name: '',
            phone_number: '',
            role: 'WASHER',
            base_salary: '',
            commission_rate: '',
        },
    });

    // Sync form when editing an existing staff member
    useEffect(() => {
        if (editingStaff) {
            reset({
                first_name: editingStaff.first_name ?? '',
                phone_number: editingStaff.phone_number ?? '',
                role: (editingStaff.role as StaffFormValues['role']) ?? 'WASHER',
                base_salary: String(editingStaff.base_salary ?? ''),
                commission_rate: String(editingStaff.commission_rate ?? ''),
            });
        } else {
            reset({
                first_name: '',
                phone_number: '',
                role: 'WASHER',
                base_salary: '',
                commission_rate: '',
            });
        }
    }, [editingStaff, reset, isStaffModalOpen]);

    const onSubmit = async (data: StaffFormValues) => {
        await saveStaff(data);
    };

    if (!isStaffModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
            <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">
                        {editingStaff ? 'EDIT STAFF' : 'REGISTER STAFF'}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsStaffModalOpen(false)}
                        className="text-[#8E939B] hover:text-white transition-colors"
                    >
                        <PlusCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                {/* Default password notice */}
                {!editingStaff && (
                    <div className="bg-[#01FFFF]/5 border border-[#01FFFF]/20 px-4 py-3 rounded-xl mb-6">
                        <p className="text-[10px] text-[#01FFFF] uppercase tracking-widest font-bold">
                            Default login password: Kallayi123!
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="space-y-4 mb-8">

                        {/* Full Name */}
                        <div>
                            <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                {...register('first_name')}
                                className={inputClass(!!errors.first_name)}
                                placeholder="e.g. Mohammed Ali"
                            />
                            <FieldError message={errors.first_name?.message} />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                {...register('phone_number')}
                                className={inputClass(!!errors.phone_number)}
                                placeholder="+91 9876543210"
                            />
                            <FieldError message={errors.phone_number?.message} />
                        </div>

                        {/* Role / Salary / Commission */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">
                                    Role
                                </label>
                                <select
                                    {...register('role')}
                                    className={`${inputClass(!!errors.role)} appearance-none`}
                                >
                                    <option value="WASHER" className="bg-[#141518]">Washer</option>
                                    <option value="TECHNICIAN" className="bg-[#141518]">Technician</option>
                                    <option value="MANAGER" className="bg-[#141518]">Manager</option>
                                    <option value="DRIVER" className="bg-[#141518]">Driver</option>
                                </select>
                                <FieldError message={errors.role?.message} />
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">
                                    Salary (₹)
                                </label>
                                <input
                                    type="number"
                                    {...register('base_salary')}
                                    className={inputClass(!!errors.base_salary)}
                                    placeholder="500"
                                />
                                <FieldError message={errors.base_salary?.message} />
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">
                                    Comm %
                                </label>
                                <input
                                    type="number"
                                    {...register('commission_rate')}
                                    className={inputClass(!!errors.commission_rate)}
                                    placeholder="10"
                                />
                                <FieldError message={errors.commission_rate?.message} />
                            </div>
                        </div>

                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="w-5 h-5" />
                        {isSubmitting
                            ? 'SAVING...'
                            : editingStaff
                            ? 'UPDATE STAFF'
                            : 'REGISTER & CREATE LOGIN'}
                    </button>
                </form>
            </div>
        </div>
    );
}
