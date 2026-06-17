from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse
from app.utils.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.utils.ratelimit import login_rate_limit

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.email == body.email) | (User.username == body.username))
        .first()
    )
    if existing:
        raise HTTPException(400, "Username or email already registered")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    body: UserLogin,
    db: Session = Depends(get_db),
    _rl: None = Depends(login_rate_limit),
):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Incorrect email or password"
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
