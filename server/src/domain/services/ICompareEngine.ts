export interface CompareOptions {
    threshold?: number;
    tolerance?: number;
    includeAA?: boolean;
    alpha?: number;
    enableClustering?: boolean;
    ignoreRegions?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
}

export interface CompareResult {
    similarity: number;
    diffPixels: number;
    totalPixels: number;
    diffImage: {
        path: string;
        url: string;
    };
    diffRegions?: any[];
}

export interface ICompareEngine {
    compare(baseImg: string, actualImg: string, options?: CompareOptions): Promise<CompareResult>;
}
