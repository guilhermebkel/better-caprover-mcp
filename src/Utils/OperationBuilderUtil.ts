export class OperationBuilderUtil {
  static buildToolName(operationName: string): string {
    return operationName.replaceAll(/([A-Z])/g, "_$1").toLowerCase();
  }
}
