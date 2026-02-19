type FirebaseAuthRestError = {
    error?: { message?: string };
};

type SignInWithPasswordResponse = {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    email: string;
    displayName?: string;
    photoUrl?: string;
};

type SignUpResponse = SignInWithPasswordResponse;