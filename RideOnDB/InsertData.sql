USE RideOn;
GO

DELETE FROM Role
DBCC CHECKIDENT ('Role', RESEED, 0)

INSERT INTO Role (RoleName)
VALUES
('Admin'),
('Secretary'),
('Payer'),
('Worker'),
('SystemAdmin')