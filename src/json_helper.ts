export class JsonHelper
{
    public static parse(data: string): any
    {
        return JSON.parse(data, JsonHelper.reviveDateTime);
    }

    private static reviveDateTime(key: any, value: any): any 
    {
        if (typeof value === 'string')
        {
            // Match ISO date
            let a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value);
            if (a)
            {
                return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6], +a[7]));
            }
        }

        return value;
    }
}