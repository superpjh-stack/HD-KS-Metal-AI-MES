"""
LSTM-AutoEncoder (PDM-03) — 비지도 이상감지.
정상 데이터로 학습 후 Reconstruction Error > threshold 시 이상 판정.
"""
import torch
import torch.nn as nn


class LSTMAutoEncoder(nn.Module):
    """
    입력 shape:  (batch, seq_len, input_dim)
    출력 shape:  (batch, seq_len, input_dim)  — 재구성된 시퀀스
    """

    def __init__(
        self,
        input_dim:  int = 1,
        hidden_dim: int = 64,
        latent_dim: int = 16,
        num_layers: int = 2,
        dropout:    float = 0.1,
    ) -> None:
        super().__init__()

        self.input_dim  = input_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        self.num_layers = num_layers

        # Encoder
        self.encoder_lstm = nn.LSTM(
            input_size  =input_dim,
            hidden_size =hidden_dim,
            num_layers  =num_layers,
            batch_first =True,
            dropout     =dropout if num_layers > 1 else 0.0,
        )
        self.encoder_fc = nn.Linear(hidden_dim, latent_dim)

        # Decoder
        self.decoder_fc = nn.Linear(latent_dim, hidden_dim)
        self.decoder_lstm = nn.LSTM(
            input_size  =hidden_dim,
            hidden_size =input_dim,
            num_layers  =num_layers,
            batch_first =True,
            dropout     =dropout if num_layers > 1 else 0.0,
        )

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, input_dim)
        out, _ = self.encoder_lstm(x)          # (B, T, hidden_dim)
        latent  = self.encoder_fc(out[:, -1])  # (B, latent_dim) — 마지막 타임스텝
        return latent

    def decode(self, latent: torch.Tensor, seq_len: int) -> torch.Tensor:
        h = self.decoder_fc(latent)                              # (B, hidden_dim)
        h_rep = h.unsqueeze(1).repeat(1, seq_len, 1)            # (B, T, hidden_dim)
        out, _ = self.decoder_lstm(h_rep)                        # (B, T, input_dim)
        return out

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seq_len = x.size(1)
        latent  = self.encode(x)
        return self.decode(latent, seq_len)

    def reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
        """배치 평균 MSE — shape: (B,)"""
        recon = self.forward(x)
        return ((x - recon) ** 2).mean(dim=(1, 2))
