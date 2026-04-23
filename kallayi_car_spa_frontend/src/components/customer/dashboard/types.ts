export interface Vehicle {
    id: number;
    make: string;
    model: string;
    plate: string;
}

export interface ActiveWash {
    status: 'QUEUED' | 'WASHING' | 'READY';
    progress: number;
    package: string;
    vehicle: string;
}

export interface Transaction {
    id: string;
    date: string;
    service: string;
    amount: number;
    status: 'PAID' | 'UNPAID';
}
