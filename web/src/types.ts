export interface User {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
}

export interface Topic {
    id: number;
    name: string;
}

export interface Asset {
    language: string;
    variant: 'portrait' | 'landscape' | 'square' | 'banner';
    url: string;
    asset_type: 'poster' | 'thumbnail' | 'subtitle';
}

export interface Program {
    id: string;
    title: string;
    description: string;
    language_primary: string;
    languages_available: string[];
    status: 'draft' | 'published' | 'archived';
    published_at?: string;
    created_at: string;
    updated_at: string;
    assets?: {
        posters?: Record<string, Record<string, string>>; // language -> variant -> url
    };
    topics?: Topic[];
    terms?: Term[];
    lessons?: Lesson[];
}

export interface Term {
    id: string;
    program_id: string;
    term_number: number;
    title: string;
    created_at: string;
}

export interface Lesson {
    id: string;
    term_id: string;
    lesson_number: number;
    title: string;
    content_type: 'video' | 'article';
    duration_ms?: number;
    is_paid: boolean;
    content_language_primary: string;
    content_languages_available: string[];
    content_urls_by_language: Record<string, string>;
    subtitle_languages?: string[];
    subtitle_urls_by_language?: Record<string, string>;
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    publish_at?: string;
    published_at?: string;
    created_at: string;
    updated_at: string;
    // Computed/joined fields
    assets?: {
        thumbnails?: Record<string, Record<string, string>>;
    };
}
