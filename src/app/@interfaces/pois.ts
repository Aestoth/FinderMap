export interface iPois {
    id: string
    showInMenu: boolean
    names: {translations:{en:string}}
    floor?: string
    node?: any
    descriptions?: {translations:{en:string}}
    icon?: any
    currentSrc?: string
    groups?: iPois[]
    pois?: iPois[]
    views?: number
    firebaseId?: string
}
