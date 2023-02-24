import { FieldValue, Timestamp } from "firebase-admin/firestore";

export class IntTimestamp extends Number {
    isNow: boolean = false;

    private constructor(value: number, isNow: boolean = false) {
        super(value);
        this.isNow = isNow;
    }

    static fromTimestamp(timestamp: Timestamp): IntTimestamp {
        return this.fromMillis(timestamp.toMillis());
    }

    static maybeFromTimestamp(timestamp: Timestamp | undefined): IntTimestamp | undefined {
        return this.maybeFromMillis(timestamp?.toMillis());
    }

    /// Maps timestamp properties in object to IntTimestamps
    static fromTimestampObject(object: any): any {
        return Object.keys(object).reduce((acc: any, key) => {
            if (object[key] instanceof Timestamp) {
                acc[key] = IntTimestamp.fromTimestamp(object[key]);
            } else if (typeof object[key] == 'object') {
                acc[key] = IntTimestamp.fromTimestampObject(object[key]);
            } else {
                acc[key] = object[key];
            }
            return acc;
        }, {});
    }

    /// Maps IntTimestamp properties in object to FieldValues
    static toFieldValueObject(object: any): any {
        return Object.keys(object).reduce((acc: any, key) => {
            if (object[key] instanceof IntTimestamp) {
                acc[key] = object[key].toFieldValue();
            } else if (typeof object[key] == 'object') {
                acc[key] = IntTimestamp.toFieldValueObject(object[key]);
            } else {
                acc[key] = object[key];
            }
            return acc;
        }, {});
    }

    static fromMillis(millis: number): IntTimestamp {
        return this.maybeFromMillis(millis)!;
    }

    static maybeFromMillis(millis: number | undefined): IntTimestamp | undefined {
        if (millis == undefined) {
            return undefined;
        }
        return new IntTimestamp(millis, false);
    }

    static now(): IntTimestamp {
        return new IntTimestamp(0, true);
    }

    public toFieldValue(): Timestamp | FieldValue {
        if (this.isNow) {
            return FieldValue.serverTimestamp();
        } else {
            return Timestamp.fromMillis(this.valueOf());
        }
    }

    public toTimestamp(): Timestamp {
        if (this.isNow) {
            return Timestamp.now();
        } else {
            return Timestamp.fromMillis(this.valueOf());
        }
    }

    public toDate(): Date {
        if (this.isNow) {
            return new Date();
        } else {
            return new Date(this.valueOf());
        }
    }
}