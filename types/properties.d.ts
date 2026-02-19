interface Property {
    id: number;
    title: string;
    propertiesId: string;
    type: propertyType;
    price: number;
    image: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    price: string;
    priceValue: number;
    badges: PropertyBadge[];
    createdAt: Date;
    updatedAt: Date;
}

interface PropertyType {
    id: number;
    propertyId: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

interface PropertyBadge {
    id: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}