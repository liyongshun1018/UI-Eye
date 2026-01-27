export interface IAIProvider {
    analyze(images: { design: string; actual: string; diff: string }, context: any): Promise<any[]>;
    diagnoseVision(actualBase64: string, designBase64: string, styles: any, elementInfo: any, similarity?: number): Promise<string>;
}
